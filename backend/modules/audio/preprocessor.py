import numpy as np

class StreamingPreprocessor:
    """Prepares audio for model inference"""
    
    def __init__(self, target_sample_rate=16000, normalize_audio=True):
        self.target_sample_rate = target_sample_rate
        self.normalize_audio = normalize_audio

    def process(self, frame_data: np.ndarray) -> np.ndarray:
        """
        Process incoming audio chunk.
        Args:
            frame_data: numpy array of audio samples (int16 or float)
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
        
        # 3. Pre-emphasis (matching typical training, e.g. 0.97 coefficient)
        # audio = np.append(audio[0], audio[1:] - 0.97 * audio[:-1]) 
        # (Commented out unless strict requirement, often handled in model)

        # 4. Normalization (if enabled)
        if self.normalize_audio:
            max_val = np.abs(audio).max()
            if max_val > 0:
                audio = audio / max_val
                
        return audio
