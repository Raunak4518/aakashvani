import torch
import torch.nn as nn
import torch.nn.functional as F
import os
# Force soundfile backend for Windows before importing torchaudio
os.environ["TORCHAUDIO_USE_SOUNDFILE"] = "1"
import torchaudio

# Try to import transformers, but allow graceful fallback
try:
    from transformers import Wav2Vec2Model, WavLMModel
    TRANSFORMERS_AVAILABLE = True
except Exception as e:
    print(f"Warning: Could not import transformers: {e}")
    print("Using MockModel fallback.")
    TRANSFORMERS_AVAILABLE = False
    Wav2Vec2Model = None
    WavLMModel = None

class Config:
    sample_rate = 16000
    chunk_sec = 4
    chunk_len = sample_rate * chunk_sec
    device = "cuda" if torch.cuda.is_available() else "cpu"

class Preprocessor(nn.Module):
    def __init__(self):
        super().__init__()
        self.pre_emphasis = 0.97

    def forward(self, wav):
        # pre-emphasis
        wav = torch.cat([wav[:1], wav[1:] - self.pre_emphasis * wav[:-1]])
        wav = wav / (wav.abs().max() + 1e-6)
        return wav

class Wav2VecExpert(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = Wav2Vec2Model.from_pretrained(
            "facebook/wav2vec2-large-xlsr-53"
        )
        self.model.feature_extractor._freeze_parameters()

    def forward(self, wav):
        # wav: [B, T]
        out = self.model(wav).last_hidden_state
        return out.mean(dim=1)  # [B, 1024]

class WavLMExpert(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = WavLMModel.from_pretrained(
            "microsoft/wavlm-large"
        )
        self.model.feature_extractor._freeze_parameters()

    def forward(self, wav):
        out = self.model(wav).last_hidden_state
        return out.mean(dim=1)

class LFCCExpert(nn.Module):
    def __init__(self):
        super().__init__()
        self.lfcc = torchaudio.transforms.LFCC(
            sample_rate=16000,
            n_lfcc=60
        )

    def forward(self, wav):
        feat = self.lfcc(wav)
        return feat.mean(dim=-1)

class RawNet3Expert(nn.Module):
    def __init__(self):
        super().__init__()

        self.conv = nn.Sequential(
            nn.Conv1d(1, 64, kernel_size=3, stride=3),
            nn.BatchNorm1d(64),
            nn.ReLU(),

            nn.Conv1d(64, 128, kernel_size=3, stride=3),
            nn.BatchNorm1d(128),
            nn.ReLU(),

            nn.AdaptiveAvgPool1d(1)
        )

        self.fc = nn.Linear(128, 256)

    def forward(self, wav):
        # wav: [B, T]
        wav = wav.unsqueeze(1)        # [B, 1, T]
        x = self.conv(wav)            # [B, 128, 1]
        x = x.squeeze(-1)             # [B, 128]
        return self.fc(x)             # [B, 256]

class AASISTBackend(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.proj = nn.Linear(input_dim, 512)
        self.encoder = nn.Sequential(
            nn.Conv1d(512, 512, 3, padding=1),
            nn.ReLU(),
            nn.Conv1d(512, 256, 3, padding=1),
            nn.ReLU()
        )

    def forward(self, x):
        x = self.proj(x).unsqueeze(-1)
        x = self.encoder(x)
        return x.mean(dim=-1)

class ExpertFusion(nn.Module):
    def __init__(self, dim=256, num_experts=4):
        super().__init__()
        self.att = nn.Linear(dim * num_experts, num_experts)

    def forward(self, embeddings):
        concat = torch.cat(embeddings, dim=-1)
        weights = torch.softmax(self.att(concat), dim=-1)

        fused = 0
        for i, e in enumerate(embeddings):
            fused += weights[:, i:i+1] * e
        return fused

class DualHead(nn.Module):
    def __init__(self, dim=256):
        super().__init__()
        self.oc = nn.Linear(dim, 1)
        self.bce = nn.Linear(dim, 1)

    def forward(self, x):
        oc_score = self.oc(x)
        bce_score = self.bce(x)
        return oc_score, bce_score

class AntiSpoofModel(nn.Module):
    def __init__(self):
        super().__init__()

        self.pre = Preprocessor()
        self.use_ssl = TRANSFORMERS_AVAILABLE

        if self.use_ssl:
            # ---- Full Experts (requires transformers) ----
            self.wav2vec = Wav2VecExpert()
            self.wavlm = WavLMExpert()
            self.backend_ssl = AASISTBackend(1024)
        
        # ---- Lightweight Experts (always available) ----
        self.lfcc = LFCCExpert()
        self.rawnet = RawNet3Expert()

        # ---- LFCC projection (60 → 256) ----
        self.lfcc_proj = nn.Sequential(
            nn.Linear(60, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256)
        )

        # ---- RawNet projection (256 already) ----
        self.raw_proj = nn.Linear(256, 256)

        # ---- Fusion + head ----
        if self.use_ssl:
            self.fusion = ExpertFusion(dim=256, num_experts=4)
        else:
            # Only 2 experts when SSL not available
            self.fusion = ExpertFusion(dim=256, num_experts=2)
        self.head = DualHead()

    def forward(self, wav):

        wav = self.pre(wav)

        embeddings = []
        
        if self.use_ssl:
            # SSL experts
            e1 = self.backend_ssl(self.wav2vec(wav))   # [B,256]
            e2 = self.backend_ssl(self.wavlm(wav))     # [B,256]
            embeddings.extend([e1, e2])

        # LFCC expert
        lfcc_feat = self.lfcc(wav)                 # [B,60]
        e3 = self.lfcc_proj(lfcc_feat)             # [B,256]
        embeddings.append(e3)

        # RawNet expert
        e4 = self.rawnet(wav)                      # [B,256]
        e4 = self.raw_proj(e4)                     # [B,256]
        embeddings.append(e4)

        fused = self.fusion(embeddings)

        return self.head(fused)

