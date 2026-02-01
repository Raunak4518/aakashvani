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
        self._model_loaded = False
        # Don't load model here - do it lazily to avoid blocking WebRTC handshake
        
    async def _ensure_model_loaded(self):
        """Load model lazily on first inference (in background thread)"""
        if self._model_loaded:
            return
        
        logger.info("Loading model lazily on first inference...")
        await asyncio.to_thread(self.model_manager.load_model)
        
        # Ensure streaming wrapper exists
        if not hasattr(self.model_manager, 'streaming_model') or self.model_manager.streaming_model is None:
            from .model import StreamingAntiSpoofModel
            from config import StreamingConfig
            self.model_manager.streaming_model = StreamingAntiSpoofModel(
                self.model_manager.model_path, 
                StreamingConfig()
            )
        
        self._model_loaded = True
        logger.info("Model ready for inference")

    async def run_inference(self, audio_buffer: np.ndarray):
        """
        Runs inference on the provided audio buffer.
        """
        try:
            # Lazy load model
            await self._ensure_model_loaded()

            # Run inference in thread to avoid blocking event loop
            result = await asyncio.to_thread(
                self.model_manager.streaming_model.forward_streaming, 
                audio_buffer
            )
            
            return result['score']
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return 0.5  # Return neutral score on system error
