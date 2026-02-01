"""
ResHybrid Model for Deepfake Audio Detection
Adapted from inference.py for streaming backend use
"""

import os
import json
import time
import torch
import torch.nn as nn
import numpy as np
import logging

logger = logging.getLogger("uvicorn")

# Configuration
SAMPLE_RATE = 16_000
DURATION_SEC = 3.0
TARGET_LEN = int(SAMPLE_RATE * DURATION_SEC)  # 48,000 samples


class RawNetLiteBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm1d(out_ch),
            nn.LeakyReLU(0.2),
            nn.MaxPool1d(2),
        )

    def forward(self, x):
        return self.conv(x)


class ResHybridModel(nn.Module):
    """
    ResHybrid: RawNetLite + WavLM fusion for deepfake detection.
    Input: [B, 1, 48000] (3 sec @ 16kHz)
    Output: [B, 1] logit (apply sigmoid for probability)
    """

    def __init__(self):
        super().__init__()

        # Path A: RawNetLite
        self.front_end = nn.Sequential(
            nn.Conv1d(1, 16, 3, stride=1, padding=1),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.2),
        )
        self.rawnet_blocks = nn.Sequential(
            RawNetLiteBlock(16, 32),
            RawNetLiteBlock(32, 64),
            RawNetLiteBlock(64, 128),
            RawNetLiteBlock(128, 256),
            nn.AdaptiveAvgPool1d(1),
        )

        # Path B: WavLM
        try:
            from transformers import WavLMModel
            self.wavlm = WavLMModel.from_pretrained("microsoft/wavlm-base")
            self.wavlm.feature_extractor._freeze_parameters()
            self.use_wavlm = True
            wavlm_dim = 768
            logger.info("WavLM loaded successfully")
        except Exception as e:
            logger.warning(f"WavLM unavailable ({e}). Using RawNet-only mode.")
            self.use_wavlm = False
            wavlm_dim = 0

        # Classifier head
        self.classifier = nn.Sequential(
            nn.Linear(256 + wavlm_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
        )

    def forward(self, x):
        """
        x: [B, 1, 48000] or [B, 48000]
        Returns: [B, 1] logit
        """
        # Ensure correct shape
        if x.dim() == 2:
            x = x.unsqueeze(1)  # [B, 48000] -> [B, 1, 48000]
        
        # RawNet path
        raw_feat = self.front_end(x)
        raw_feat = self.rawnet_blocks(raw_feat).squeeze(-1)  # [B, 256]

        # WavLM path
        if self.use_wavlm:
            with torch.no_grad():
                ssl_out = self.wavlm(x.squeeze(1)).last_hidden_state
                ssl_feat = ssl_out.mean(dim=1)  # [B, 768]
            combined = torch.cat((raw_feat, ssl_feat), dim=1)
        else:
            combined = raw_feat

        return self.classifier(combined)  # [B, 1]


class ResHybridPredictor:
    """
    Stateful wrapper for ResHybridModel.
    Handles model loading, threshold, and inference.
    """

    def __init__(
        self,
        checkpoint_path: str,
        threshold_path: str = None,
        device: str = None
    ):
        # Device selection
        if device:
            self.device = torch.device(device)
        elif torch.cuda.is_available():
            # Check if GPU has enough memory (~1GB needed)
            try:
                free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated()
                free_gb = free_mem / (1024**3)
                self.device = torch.device('cuda' if free_gb >= 1.0 else 'cpu')
                logger.info(f"GPU free memory: {free_gb:.2f} GB")
            except:
                self.device = torch.device('cpu')
        else:
            self.device = torch.device('cpu')
        
        logger.info(f"Using device: {self.device}")

        # Load threshold
        self.threshold = self._load_threshold(threshold_path)

        # Load model
        self.model = ResHybridModel().to(self.device)
        
        if os.path.exists(checkpoint_path):
            state = torch.load(checkpoint_path, map_location=self.device)
            self.model.load_state_dict(state)
            logger.info(f"Model loaded from {checkpoint_path}")
        else:
            logger.error(f"Checkpoint not found: {checkpoint_path}")
        
        self.model.eval()

    def _load_threshold(self, path: str) -> float:
        """Load threshold from JSON file"""
        if path and os.path.isfile(path):
            try:
                with open(path) as f:
                    data = json.load(f)
                thresh = data.get("threshold", 0.5)
                logger.info(f"Threshold loaded: {thresh:.4f}")
                return thresh
            except Exception as e:
                logger.warning(f"Error loading threshold: {e}")
        
        logger.warning("Using default threshold 0.5")
        return 0.5

    @torch.no_grad()
    def predict(self, audio: np.ndarray) -> dict:
        """
        Run inference on raw audio samples.
        
        Args:
            audio: numpy array of shape [samples] or [1, samples], 16kHz mono
            
        Returns:
            dict with score, label, confidence, is_spoof
        """
        t0 = time.perf_counter()

        # Prepare input
        if isinstance(audio, np.ndarray):
            tensor = torch.from_numpy(audio).float()
        else:
            tensor = audio.float()

        # Ensure correct shape [1, 1, TARGET_LEN]
        if tensor.dim() == 1:
            tensor = tensor.unsqueeze(0).unsqueeze(0)
        elif tensor.dim() == 2:
            tensor = tensor.unsqueeze(0)

        # Pad or crop to TARGET_LEN
        length = tensor.shape[-1]
        if length > TARGET_LEN:
            start = (length - TARGET_LEN) // 2
            tensor = tensor[..., start:start + TARGET_LEN]
        elif length < TARGET_LEN:
            pad_len = TARGET_LEN - length
            tensor = nn.functional.pad(tensor, (0, pad_len))

        tensor = tensor.to(self.device)

        # Inference
        logit = self.model(tensor)
        score = torch.sigmoid(logit).item()
        
        latency = (time.perf_counter() - t0) * 1000  # ms

        # Compute results
        is_fake = score >= self.threshold
        confidence = min(abs(score - self.threshold) / max(self.threshold, 1 - self.threshold), 1.0)

        return {
            "score": round(score, 4),
            "label": "FAKE" if is_fake else "REAL",
            "is_spoof": is_fake,
            "confidence": round(confidence * 100, 2),  # 0-100 scale for frontend
            "latency_ms": round(latency, 2),
            "threshold": self.threshold,
        }

    def forward_streaming(self, audio: np.ndarray) -> dict:
        """Alias for compatibility with existing InferenceRunner"""
        result = self.predict(audio)
        return {
            "score": result["score"],
            "oc_score": result["confidence"],
            "length": len(audio) if hasattr(audio, '__len__') else 0,
            "success": True,
            "is_spoof": result["is_spoof"],
            "label": result["label"],
        }
