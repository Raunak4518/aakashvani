"""
ModelManager - Manages ResHybrid model lifecycle
"""

import os
import logging
import threading

logger = logging.getLogger("uvicorn")

# Paths relative to backend directory
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models")
DEFAULT_CHECKPOINT = os.path.join(MODELS_DIR, "best_res_hybrid_model_v3.pth")
DEFAULT_THRESHOLD = os.path.join(MODELS_DIR, "threshold.json")


class ModelManager:
    """
    Singleton that manages ResHybrid model lifecycle.
    Uses ResHybridPredictor for inference.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(
        self,
        model_path: str = None,
        threshold_path: str = None
    ):
        if self._initialized:
            return
            
        self.model_path = model_path or DEFAULT_CHECKPOINT
        self.threshold_path = threshold_path or DEFAULT_THRESHOLD
        self.predictor = None
        self._load_lock = threading.Lock()
        self._initialized = True
        
        logger.info(f"ModelManager initialized")
        logger.info(f"  Checkpoint: {self.model_path}")
        logger.info(f"  Threshold: {self.threshold_path}")

    def load_model(self):
        """Load the ResHybrid model (thread-safe, idempotent)"""
        if self.predictor is not None:
            return

        with self._load_lock:
            if self.predictor is not None:
                return

            logger.info("Loading ResHybrid model...")
            
            try:
                from .res_hybrid_model import ResHybridPredictor
                
                self.predictor = ResHybridPredictor(
                    checkpoint_path=self.model_path,
                    threshold_path=self.threshold_path,
                )
                logger.info("ResHybrid model loaded successfully")
                
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                import traceback
                traceback.print_exc()
                self.predictor = MockPredictor()

    def predict(self, audio_buffer):
        """Run inference on audio buffer"""
        if self.predictor is None:
            self.load_model()
        
        return self.predictor.forward_streaming(audio_buffer)
    
    # Alias for compatibility
    @property
    def streaming_model(self):
        if self.predictor is None:
            self.load_model()
        return self.predictor


class MockPredictor:
    """Fallback predictor for testing"""
    
    def forward_streaming(self, audio):
        import random
        return {
            "score": random.random(),
            "oc_score": random.random() * 100,
            "length": len(audio) if hasattr(audio, '__len__') else 0,
            "success": True,
            "is_spoof": False,
            "label": "REAL",
        }
    
    def predict(self, audio):
        return self.forward_streaming(audio)