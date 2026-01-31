import numpy as np
import logging

logger = logging.getLogger("uvicorn")

class ValidationResult:
    def __init__(self, is_valid=True, is_silence=False, is_clipping=False, msg=""):
        self.is_valid = is_valid
        self.is_silence = is_silence
        self.is_clipping = is_clipping
        self.msg = msg

class AudioFrameValidator:
    """Validates incoming audio frames for correctness and quality"""
    
    def __init__(self, expected_shape=(1, 1920), sample_rate=16000):
        self.expected_shape = expected_shape
        self.sample_rate = sample_rate
        self.silence_threshold = 0.001
        self.clipping_threshold = 0.99

    def validate(self, frame) -> ValidationResult:
        """
        Validates the audio frame structure and checks for quality issues.
        Returns: ValidationResult object
        """
        try:
            # 1. Type Check
            if hasattr(frame, 'to_ndarray'):
                data = frame.to_ndarray()
            elif isinstance(frame, np.ndarray):
                data = frame
            else:
                return ValidationResult(False, msg="Invalid frame type")

            # 2. Structure Check (NaNs/Infs)
            if not np.isfinite(data).all():
                return ValidationResult(False, msg="Frame contains NaN/Inf")

            # 3. Quality Metrics
            # Calculate RMS
            # Ensure float32 for calc to avoid overflow if int
            if data.dtype != np.float32:
                float_data = data.astype(np.float32) / 32768.0 if data.dtype == np.int16 else data.astype(np.float32)
            else:
                float_data = data
                
            rms = np.sqrt(np.mean(float_data**2))
            is_silence = rms < self.silence_threshold
            
            # Check Clipping
            is_clipping = np.max(np.abs(float_data)) >= self.clipping_threshold

            # 4. Shape Check (Warning only, or strict?)
            # We enforce validity but return quality flags
            if data.size == 0:
                 return ValidationResult(False, msg="Empty frame")

            return ValidationResult(True, is_silence, is_clipping)

        except Exception as e:
            logger.error(f"Validator Error: {e}")
            return ValidationResult(False, msg=str(e))
