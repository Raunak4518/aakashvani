import torch
import os
import logging

logger = logging.getLogger("uvicorn")

class ModelManager:
    """Handles model lifecycle and optimization"""
    
    def __init__(self, model_path="best_model.pt"):
        self.model_path = model_path
        self.model = None
        # Force CPU - GPU (3.68 GB) has insufficient memory for this model
        self.device = torch.device('cpu')
        
    def load_model(self):
        """Loads the model from disk"""
        try:
            if not os.path.exists(self.model_path):
                 # Fallback for development if file missing
                 logger.warning(f"Model file {self.model_path} not found. Using Mock Model.")
                 self.model = MockModel() 
                 return

            logger.info(f"Loading model from {self.model_path} to {self.device}")
            
            # Try JIT load first (for TorchScript models)
            try:
                self.model = torch.jit.load(self.model_path, map_location=self.device)
                self.model.eval()
                logger.info("Model loaded successfully (TorchScript)")
                return
            except Exception as jit_error:
                logger.info(f"Not a TorchScript model, trying state_dict load: {jit_error}")
            
            # Load as state dict or full model
            checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
            
            # Check if it's a state dict (OrderedDict) or a full model
            if isinstance(checkpoint, dict):
                logger.info("Detected state_dict. Initializing AntiSpoofModel architecture...")
                from .arch import AntiSpoofModel
                
                self.model = AntiSpoofModel()
                
                # Handle DataParallel checkpoint (keys starting with 'module.')
                if checkpoint and list(checkpoint.keys())[0].startswith('module.'):
                    checkpoint = {k[7:]: v for k, v in checkpoint.items()}
                
                self.model.load_state_dict(checkpoint, strict=False)
                self.model.to(self.device)
                self.model.eval()
                logger.info("Model loaded successfully (state_dict -> AntiSpoofModel)")
            else:
                # Full model object
                self.model = checkpoint
                self.model.to(self.device)
                self.model.eval()
                logger.info("Model loaded successfully (full model)")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            import traceback
            traceback.print_exc()
            self.model = MockModel()

    def predict(self, input_tensor):
        """Runs inference"""
        if self.model is None:
            self.load_model()
            
        with torch.no_grad():
            return self.model(input_tensor.to(self.device))

class MockModel:
    """Fallback model for testing without weight file"""
    def __call__(self, x):
        import random
        # Return fake prob
        # Output shape matching what we expect (e.g. [batch, 1] prob)
        return torch.tensor([[random.random()]])

# import torch
# import os
# import logging
# import threading
# from transformers import Wav2Vec2ForCTC, Wav2Vec2Config

# logger = logging.getLogger("uvicorn")

# class ModelManager:
#     _instance = None
#     _lock = threading.Lock()  # Prevent race conditions during load

#     def __new__(cls, *args, **kwargs):
#         with cls._lock:
#             if cls._instance is None:
#                 cls._instance = super(ModelManager, cls).__new__(cls)
#                 cls._instance.initialized = False
#                 cls._instance.model = None
#         return cls._instance

#     def __init__(self, model_path="best_model.pt"):
#         # This runs every time you call ModelManager(), 
#         # so we must skip if already initialized.
#         if self.initialized:
#             return
#         self.model_path = model_path
#         self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
#         self.initialized = True
        
#     def _get_memory_info(self):
#         """Get GPU memory info if available"""
#         if torch.cuda.is_available():
#             torch.cuda.synchronize()
#             free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated()
#             return free_mem / (1024**3)  # Free memory in GB
#         return 0.0
        
#     def _should_use_cpu(self):
#         """Determine if we should use CPU based on available GPU memory"""
#         if not torch.cuda.is_available():
#             return True
        
#         # Wav2Vec2 large needs ~3GB+ in FP16, plus overhead
#         # If GPU has less than 4GB free, use CPU
#         free_mem = self._get_memory_info()
#         logger.info(f"GPU free memory: {free_mem:.2f} GB")
        
#         # For GPU with <4GB free, use CPU to avoid OOM
#         return free_mem < 4.0
        
#     def load_model(self):
#         # 1. IMMEDIATE EXIT if model exists
#         if self.model is not None:
#             return

#         with self._lock:
#             # Double-check inside lock
#             if self.model is not None:
#                 return

#             try:
#                 # Check if we should use CPU (safer for small GPUs)
#                 use_cpu = self._should_use_cpu()
#                 if use_cpu:
#                     self.device = torch.device('cpu')
#                     logger.info(f"Using CPU for inference (GPU memory insufficient)")
#                 else:
#                     logger.info(f"Attempting to move model to {self.device} in FP16...")
                
#                 # FIX 1: Wrap construction in torch.device('cpu') context.
#                 # This prevents Wav2Vec2ForCTC(config) from silently placing
#                 # buffers on the GPU before we explicitly call .to(device).
#                 with torch.device('cpu'):
#                     config = Wav2Vec2Config.from_pretrained("facebook/wav2vec2-large-xlsr-53")
#                     model_obj = Wav2Vec2ForCTC(config)
                
#                 # Load state dict on CPU with weights_only for security
#                 state_dict = torch.load(self.model_path, map_location="cpu", weights_only=False)
#                 model_obj.load_state_dict(state_dict, strict=False)
                
#                 # Clear loaded state dict to free memory
#                 del state_dict
                
#                 # Move to device
#                 if self.device.type == 'cuda':
#                     self.model = model_obj.half().to(self.device)
#                 else:
#                     self.model = model_obj.to(self.device)
                    
#                 self.model.eval()
                
#                 # Cleanup
#                 del model_obj
#                 if torch.cuda.is_available():
#                     torch.cuda.empty_cache()
                
#                 logger.info(f"Model loaded successfully on {self.device}")
                
#             # FIX 2: CUDA OOM is frequently raised as a plain RuntimeError,
#             # not torch.cuda.OutOfMemoryError. Catch both, but re-raise
#             # RuntimeErrors that aren't actually OOM.
#             except (torch.cuda.OutOfMemoryError, RuntimeError) as e:
#                 if not isinstance(e, torch.cuda.OutOfMemoryError) and "out of memory" not in str(e).lower():
#                     raise  # Not an OOM error — don't swallow it
#                 logger.warning(f"GPU OOM: Falling back to CPU. ({e})")
#                 self.device = torch.device('cpu')
#                 # Try again with CPU
#                 try:
#                     with torch.device('cpu'):
#                         config = Wav2Vec2Config.from_pretrained("facebook/wav2vec2-large-xlsr-53")
#                         model_obj = Wav2Vec2ForCTC(config)
#                     state_dict = torch.load(self.model_path, map_location="cpu", weights_only=False)
#                     model_obj.load_state_dict(state_dict, strict=False)
#                     del state_dict
#                     self.model = model_obj.to('cpu')
#                     self.model.eval()
#                     del model_obj
#                     torch.cuda.empty_cache()
#                     logger.info("Model loaded successfully on CPU fallback")
#                 except Exception as cpu_e:
#                     logger.error(f"CPU fallback also failed: {cpu_e}")
#                     self.model = MockModel()
#             except Exception as e:
#                 logger.error(f"Model Load Error: {e}. Using Mock.")
#                 self.model = MockModel()

#     def predict(self, input_tensor):
#         if self.model is None:
#             self.load_model()
            
#         with torch.no_grad():
#             x = input_tensor.to(self.device)
#             if self.device.type == 'cuda':
#                 x = x.half()
#             return self.model(x)

# class MockModel:
#     def __call__(self, x):
#         import random
#         return torch.tensor([[random.random()]])