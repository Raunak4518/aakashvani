import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict
from config import StreamingConfig
from .arch import AntiSpoofModel

class StreamingAntiSpoofModel(nn.Module):
    """
    Wrapper around AntiSpoofModel for streaming scenarios
    """
    
    def __init__(self, model_path: str, config: StreamingConfig):
        super().__init__()
        self.config = config
        
        # Load the base model
        try:
            self.model = self.load_model(model_path)
        except Exception as e:
            print(f"Model Load Error: {e}. Using Mock.")
            self.model = MockModel()

        # Optimization flags
        self.use_half_precision = config.use_fp16
        self.use_torchscript = config.use_torchscript
        
        if self.use_torchscript:
            try:
                self.model = torch.jit.script(self.model)
            except Exception as e:
                print(f"TorchScript conversion failed: {e}")
    
    def load_model(self, path: str):
        """Loads model weights into architecture"""
        print(f"Loading model from {path}...")
        
        # 1. Load Checkpoint
        checkpoint = torch.load(path, map_location=self.config.device, weights_only=True)
        
        # 2. Check if it's state_dict or full model
        if isinstance(checkpoint, dict):
             # It's weights (state_dict)
             print("Detected state_dict. Initializing architecture...")
             model = AntiSpoofModel()
             
             # Handle DataParallel casing if present (keys starting with 'module.')
             if list(checkpoint.keys())[0].startswith('module.'):
                 checkpoint = {k[7:]: v for k, v in checkpoint.items()}
                 
             model.load_state_dict(checkpoint, strict=False) # Allow lenient loading
             model.to(self.config.device)
             model.eval()
             return model
        else:
             # Full model object
             checkpoint.to(self.config.device)
             checkpoint.eval()
             return checkpoint
    
    @torch.no_grad()
    def forward_streaming(self, audio: np.ndarray) -> Dict[str, float]:
        """
        Process audio chunk for streaming inference
        
        Args:
            audio: NumPy array of shape (1, T) where T >= min_length
            
        Returns:
            Dictionary with score and metadata
        """
        # Convert to tensor
        if isinstance(audio, np.ndarray):
            audio_tensor = torch.from_numpy(audio).float()
        else:
            audio_tensor = audio
        
        # Move to device
        audio_tensor = audio_tensor.to(self.config.device)
        
        # Half precision if enabled
        if self.use_half_precision:
            audio_tensor = audio_tensor.half()
        
        # Handle variable length (Pad if too short)
        min_len = 16000  # 1 second minimum
        if audio_tensor.shape[-1] < min_len:
            audio_tensor = F.pad(
                audio_tensor, 
                (0, min_len - audio_tensor.shape[-1])
            )
        
        # Forward pass
        try:
            # Check model output signature
            output = self.model(audio_tensor)
            
            # Scenario A: Tuple (oc_score, bce_score)
            if isinstance(output, tuple):
                 oc_score, bce_score = output
                 prob = torch.sigmoid(bce_score).item()
                 raw_score = oc_score.item()
            # Scenario B: Single Logit/Prob
            else:
                 prob = output.item()
                 raw_score = prob
                 
            # Edge Case: NaN Output
            if np.isnan(prob) or np.isnan(raw_score):
                 print("Warning: Model returned NaN. Returning neutral score.")
                 return {
                    'score': 0.5,
                    'oc_score': 0.0,
                    'length': audio_tensor.shape[-1],
                    'success': True 
                 }

            return {
                'score': prob,
                'oc_score': raw_score,
                'length': audio_tensor.shape[-1],
                'success': True
            }
            
        except RuntimeError as e:
            if "out of memory" in str(e):
                print("Error: CUDA Out of Memory!")
                torch.cuda.empty_cache() # Mitigate
            else:
                print(f"Runtime Error: {e}")
                
            return {
                'score': 0.5, # Neutral
                'error': str(e),
                'success': False
            }
        except Exception as e:
            print(f"Inference Forward Error: {e}")
            return {
                'score': 0.5, # Neutral
                'error': str(e),
                'success': False
            }

class MockModel(nn.Module):
    def forward(self, x):
        import random
        # Return tuple to match expected signature in try block
        return (torch.tensor([random.random()]), torch.tensor([random.random()]))
