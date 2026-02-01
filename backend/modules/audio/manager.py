import numpy as np
import time
import logging
from typing import Optional, Dict
from config import StreamingConfig

from .validator import AudioFrameValidator
from .buffer import RingBufferManager
from .preprocessor import StreamingPreprocessor

from modules.inference.model_manager import ModelManager
from modules.inference.queue import InferenceQueue
from modules.inference.runner import InferenceRunner
from modules.results.aggregator import ScoreAggregator
from modules.results.alert import AlertManager
from modules.results.handler import ResponseHandler

logger = logging.getLogger("uvicorn")

class MetricsCollector:
    def __init__(self):
        self.metrics = {}
    def increment(self, key):
        self.metrics[key] = self.metrics.get(key, 0) + 1

class StreamState:
    IDLE = "IDLE"
    PROCESSING = "PROCESSING"

from modules.error_handler import ErrorHandler
from modules.errors import FrameValidationError, InferenceError

class AudioStreamManager:
    """
    Main class orchestrating the entire streaming pipeline
    """
    
    def __init__(self, config: StreamingConfig):
        self.config = config
        self.error_handler = ErrorHandler(config)
        
        # Initialize all components
        try:
            self.validator = AudioFrameValidator()
            self.buffer_manager = RingBufferManager(
                buffer_size=config.buffer_size,
                frame_size=config.frame_size
            )
            
            # Initialize robust preprocessor with config settings
            self.preprocessor = StreamingPreprocessor(
                target_sample_rate=config.sample_rate,
                mode=config.preprocessing_mode,
                aggressiveness=config.noise_reduction_aggressiveness
            )
            
            # Inference pipeline
            self.model_manager = ModelManager() # Loads best_model.pt
            self.inference_queue = InferenceQueue(max_size=config.queue_size)
            self.inference_runner = InferenceRunner() 
            
            # Results processing
            self.score_aggregator = ScoreAggregator(window_size=config.aggregation_window)
            self.alert_manager = AlertManager(threshold=config.threshold)
            self.response_handler = ResponseHandler(None)
            
            # State management
            self.state = StreamState.IDLE
            self.metrics = MetricsCollector()
            
            logger.info(f"AudioStreamManager initialized with preprocessing mode: {config.preprocessing_mode}")
            
        except Exception as e:
            self.error_handler.handle(e, context={"phase": "init"})

    async def process_frame(self, frame: np.ndarray, frame_obj=None) -> Optional[Dict]:
        """
        Main entry point for processing audio frames
        """
        timestamp_start = time.time()
        
        try:
            # 1. Validate frame
            # Use frame_obj if available (av.AudioFrame) or the numpy array
            validation_input = frame_obj if frame_obj else frame
            val_result = self.validator.validate(validation_input)
            
            if not val_result.is_valid:
                self.metrics.increment('invalid_frames')
                # Raise low severity error
                raise FrameValidationError(val_result.msg)
            
            # Handle Audio Quality Edge Cases
            if val_result.is_silence:
                self.metrics.increment('silence_frames')
                return None
            
            if val_result.is_clipping:
                self.metrics.increment('clipping_frames')
                # Log warning via handler? Or just metric.
                # self.error_handler.handle(StreamingError("Clipping", ErrorSeverity.LOW), ...)
            
            # 2. Add to buffer
            buffer_ready = self.buffer_manager.add_frame(frame)
            
            if not buffer_ready:
                return None  # Buffer not full yet
            
            # 3. Extract window for inference
            audio_window = self.buffer_manager.get_inference_window()
            
            # 4. Run Inference with Latency Check
            t0 = time.time()
            try:
                result_score = await self.inference_runner.run_inference(audio_window)
            except Exception as ie:
                raise InferenceError(str(ie))

            latency = time.time() - t0
            
            # Edge Case: Slow Inference
            if latency > self.config.inference_timeout:
                self.metrics.increment('slow_inference')
                logger.warning(f"High inference latency: {latency:.3f}s")
            
            # 5. Aggregate score
            aggregated_score = self.score_aggregator.add_score(result_score)
            
            # 6. Check for alerts
            alert = self.alert_manager.check_alert(aggregated_score)
            
            # 7. Format response
            response = {
                'timestamp': time.time(),
                'score': aggregated_score,
                'confidence': aggregated_score * 100,
                'is_spoof': aggregated_score > self.config.threshold,
                'alert': alert,
                'latency': latency
            }
            
            return response
            
        except Exception as e:
            # Centralized handling
            self.error_handler.handle(e)
            return None
