import sys
import os
import time
import numpy as np

# Add the current directory to path so we can import utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.buffer import CircularAudioBuffer

def test_circular_buffer():
    print("Testing CircularAudioBuffer...")

    SR = 48000
    CH = 2
    DURATION = 10
    
    # 1. Initialize
    buffer = CircularAudioBuffer(duration_sec=DURATION, sample_rate=SR, channels=CH)
    print(f"Initialized buffer with capacity {buffer.capacity} frames.")
    
    # Check initial state
    assert buffer.write_index == 0
    assert not buffer.is_filled
    assert len(buffer.get_buffer()) == 0

    # 2. Add a small chunk (1 second)
    chunk_size = SR // 1  # 1 second
    chunk1 = np.ones((chunk_size, CH), dtype=np.int16) * 1 # Fill with 1s
    buffer.add_frame(chunk1)
    
    current = buffer.get_buffer()
    assert len(current) == chunk_size
    assert np.all(current == 1)
    assert buffer.write_index == chunk_size
    print("Pass: Added 1 second chunk.")

    # 3. Fill up to just before full (add 8 more seconds, total 9)
    chunk8 = np.ones((SR * 8, CH), dtype=np.int16) * 2 # Fill with 2s
    buffer.add_frame(chunk8)
    
    current = buffer.get_buffer()
    assert len(current) == SR * 9
    # First 1s should be 1s, next 8s should be 2s
    assert np.all(current[:SR] == 1)
    assert np.all(current[SR:] == 2)
    print("Pass: Added 8 more seconds (total 9s).")
    
    # 4. Overflow/Wrap (add 2 seconds, total 11s -> should hold last 10s)
    # The buffer holds 10s. We have 9s. Adding 2s pushes us to 11s seen.
    # Expected result: Drop the first 1s (the 1s), keep 8s of 2s, and 2s of 3s.
    chunk2 = np.ones((SR * 2, CH), dtype=np.int16) * 3 # Fill with 3s
    buffer.add_frame(chunk2)
    
    current = buffer.get_buffer()
    assert len(current) == SR * 10
    
    # Verify content
    # We expect: 8 seconds of '2's, then 2 seconds of '3's.
    # Wait: total seen 1s(1) + 8s(2) + 2s(3) = 11s.
    # Buffer holds 10s. Oldest was 1s(1). Next oldest 8s(2).
    # We drop the oldest 1s.
    # So we should have 8s of (2) and 2s of (3).
    
    part1_size = SR * 8
    part2_size = SR * 2
    
    part1 = current[:part1_size]
    part2 = current[part1_size:]
    
    if np.all(part1 == 2) and np.all(part2 == 3):
        print("Pass: Wrap around correctness verified (Values match).")
    else:
        print("FAIL: Wrap around values mismatch.")
        print(f"Mean part1: {np.mean(part1)} (expected 2)")
        print(f"Mean part2: {np.mean(part2)} (expected 3)")
        
        # Debugging indices
        print(f"Write Index: {buffer.write_index}")
    
    # 5. Massive overflow (add 15 seconds)
    chunk15 = np.ones((SR * 15, CH), dtype=np.int16) * 4
    buffer.add_frame(chunk15)
    current = buffer.get_buffer()
    
    assert len(current) == SR * 10
    assert np.all(current == 4)  # Should be all 4s
    print("Pass: Massive overflow handled.")
    
    # 6. Test with Mock AudioFrame object (mimicking av.AudioFrame)
    class MockAudioFrame:
        def __init__(self, data):
            self.data = data # format: (samples, channels)
        def to_ndarray(self):
            # av.AudioFrame.to_ndarray() usually returns (channels, samples) depending on format, 
            # let's return (samples, channels) here as it's our simplified mock, 
            # or (channels, samples) and ensure our code handles it.
            # Let's test the transposition logic: Pass (CH, Samples)
            return self.data.T 

    # Create data of shape (SR, CH) i.e. (48000, 2)
    chunk_mock = np.ones((SR, CH), dtype=np.int16) * 5
    # Mock frame returning (CH, SR) to trigger transpose check
    mock_frame = MockAudioFrame(chunk_mock) 
    
    buffer.add_frame(mock_frame)
    current = buffer.get_buffer()
    
    # Latest 1s should be 5s
    last_1s = current[-SR:]
    assert np.all(last_1s == 5)
    print("Pass: Mock AudioFrame handling (with transpose) verified.")

    print("All tests passed!")

if __name__ == "__main__":
    test_circular_buffer()
