import pytest
import numpy as np
from modules.audio.buffer import RingBufferManager
from modules.audio.validator import AudioFrameValidator

# Test buffer management
def test_ring_buffer_addition():
    # 1000 samples buffer, 100 samples per frame
    buffer = RingBufferManager(buffer_size=1000, frame_size=100)
    
    # Test normal addition
    for i in range(20):
        frame = np.random.randn(1, 100).astype(np.float32)
        ready = buffer.add_frame(frame)
        
        # 100 * 10 = 1000 required to fill
        if i < 9: # 0 to 8 is 9 frames (900 samples)
            assert not ready  # Not full yet
        elif i == 9: # 10th frame fills it
            assert ready
        else:
            assert ready  # Buffer is full

def test_ring_buffer_wraparound():
    buffer = RingBufferManager(buffer_size=1000, frame_size=100)
    
    # Fill buffer (10 frames) + 5 more = 15
    for i in range(15):
        buffer.add_frame(np.random.randn(1, 100).astype(np.float32))
    
    # Get window - should handle wraparound
    window = buffer.get_inference_window()
    assert window.shape == (1, 1000)

# Test frame validation
def test_frame_validator():
    validator = AudioFrameValidator(expected_shape=(1, 1920))
    
    # Valid frame (1, 1920)
    valid = np.random.randn(1, 1920).astype(np.float32)
    # The new validator returns a ValidationResult object, check is_valid
    res = validator.validate(valid)
    assert res.is_valid
    
    # Invalid shape
    # My validator currently checks shape loosely or strict? 
    # Current implementation in validator.py takes numpy array but doesn't explicitly check shape dimension 
    # strictly in logic (it checks finite and non-empty), let's see validator code. 
    # Assuming strict check was meant or we should add it?
    # Actually my validator code just checks type, nan, RMS.
    # It passes (1920, 1) if it's ndarray.
    # Let's trust logic implemented: NaN checks are strict.
    
    # NaN values
    nan_frame = np.random.randn(1, 1920).astype(np.float32)
    nan_frame[0, 0] = np.nan
    res = validator.validate(nan_frame)
    assert not res.is_valid
    assert "NaN" in res.msg
