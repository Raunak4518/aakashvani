import numpy as np
from typing import Optional, Tuple
from .robust_preprocessor import RobustAudioPreprocessor, create_preprocessor, AudioQualityMetrics


class StreamingPreprocessor:
    """
    Prepares audio for model inference with robust handling of:
    - Network quality issues (packet loss, jitter)
    - VoIP call noise and codec artifacts
    - Real-time processing requirements
    """
    
    def __init__(self, target_sample_rate: int = 16000, normalize_audio: bool = True,
                 mode: str = "voip", aggressiveness: float = 0.3):
        """
        Initialize the preprocessor.
        
        Args:
            target_sample_rate: Target sample rate for output
            normalize_audio: Whether to normalize audio levels
            mode: Processing mode - "voip", "clean", or "aggressive"
            aggressiveness: Noise reduction strength (0.0 to 1.0)
        """
        self.target_sample_rate = target_sample_rate
        self.normalize_audio = normalize_audio
        self.mode = mode
        
        # Initialize robust preprocessor for advanced processing
        self.robust_processor = create_preprocessor(mode=mode, aggressiveness=aggressiveness)
        
        # Quality metrics
        self.last_quality_metrics: Optional[AudioQualityMetrics] = None
        self.quality_check_interval = 10  # Check quality every N frames
        self.frame_count = 0

    def process(self, frame_data: np.ndarray, check_quality: bool = False) -> np.ndarray:
        """
        Process incoming audio chunk with robust preprocessing.
        
        Args:
            frame_data: numpy array of audio samples (int16 or float)
            check_quality: Force quality check on this frame
            
        Returns:
            np.ndarray: Processed audio (float32, normalized)
        """
        # 1. Convert to float32 if int16
        if frame_data.dtype == np.int16:
            audio = frame_data.astype(np.float32) / 32768.0
        else:
            audio = frame_data.astype(np.float32)
        
        # 2. Determine if we should check quality this frame
        self.frame_count += 1
        should_check_quality = check_quality or (self.frame_count % self.quality_check_interval == 0)
        
        # 3. Apply robust preprocessing
        audio, metrics = self.robust_processor.process(audio, detect_quality=should_check_quality)
        
        if metrics:
            self.last_quality_metrics = metrics
            
        return audio
    
    def process_simple(self, frame_data: np.ndarray) -> np.ndarray:
        """
        Simple processing without robust features (faster).
        Use this for known high-quality sources.
        
        Args:
            frame_data: numpy array of audio samples
            
        Returns:
            np.ndarray: Processed audio (float32)
        """
        # 1. Convert to float32 if int16
        if frame_data.dtype == np.int16:
            audio = frame_data.astype(np.float32) / 32768.0
        else:
            audio = frame_data.astype(np.float32)

        # 2. DC Offset Removal
        audio = audio - np.mean(audio)

        # 3. Normalization (if enabled)
        if self.normalize_audio:
            max_val = np.abs(audio).max()
            if max_val > 0:
                audio = audio / max_val
                
        return audio
    
    def get_quality_metrics(self) -> Optional[AudioQualityMetrics]:
        """Get the last computed quality metrics"""
        return self.last_quality_metrics
    
    def get_processing_stats(self) -> dict:
        """Get processing statistics"""
        stats = self.robust_processor.get_stats()
        stats["mode"] = self.mode
        stats["frames_since_start"] = self.frame_count
        return stats
    
    def set_mode(self, mode: str, aggressiveness: float = 0.3):
        """
        Change processing mode on the fly.
        
        Args:
            mode: "voip", "clean", or "aggressive"
            aggressiveness: Noise reduction strength
        """
        self.mode = mode
        self.robust_processor = create_preprocessor(mode=mode, aggressiveness=aggressiveness)

