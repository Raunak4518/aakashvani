import torch
import numpy as np
import logging
import asyncio
from .model_manager import ModelManager

logger = logging.getLogger("uvicorn")

class InferenceRunner:
    """Executes model inference"""
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.model_manager.load_model()
        
    async def run_inference(self, audio_buffer: np.ndarray):
        """
        Runs inference on the provided audio buffer.
        """
        try:
            # Ensure model is wrapped
            if not hasattr(self.model_manager, 'streaming_model'):
                from .model import StreamingAntiSpoofModel
                from config import StreamingConfig
                # Initialize wrapper
                self.model_manager.streaming_model = StreamingAntiSpoofModel(
                    self.model_manager.model_path, 
                    StreamingConfig()
                )

            # Run via wrapper
            # Run in thread to avoid blocking event loop
            result = await asyncio.to_thread(
                self.model_manager.streaming_model.forward_streaming, 
                audio_buffer
            )
            
            return result['score']
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return 0.5 # Return neutral score on system error
