"""
InferenceRunner - Runs model inference on audio buffers
"""

import numpy as np
import logging
import asyncio
from .model_manager import ModelManager

logger = logging.getLogger("uvicorn")


class InferenceRunner:
    """Executes model inference asynchronously"""
    
    def __init__(self):
        self.model_manager = ModelManager()
        self._model_loaded = False

    async def _ensure_model_loaded(self):
        """Load model lazily on first inference (in background thread)"""
        if self._model_loaded:
            return
        
        logger.info("Loading model lazily on first inference...")
        await asyncio.to_thread(self.model_manager.load_model)
        self._model_loaded = True
        logger.info("Model ready for inference")

    async def run_inference(self, audio_buffer: np.ndarray) -> float:
        """
        Runs inference on the provided audio buffer.
        
        Args:
            audio_buffer: numpy array of audio samples (16kHz mono)
            
        Returns:
            float: Detection score (0-1, higher = more likely fake)
        """
        try:
            # Lazy load model
            await self._ensure_model_loaded()

            # Run inference in thread to avoid blocking event loop
            result = await asyncio.to_thread(
                self.model_manager.predict, 
                audio_buffer
            )
            
            return result.get("score", 0.5)
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return 0.5  # Return neutral score on error
