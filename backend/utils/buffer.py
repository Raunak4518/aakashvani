import numpy as np
import threading

class CircularAudioBuffer:
    def __init__(self, duration_sec=10, sample_rate=48000, channels=2, dtype=np.int16):
        """
        Initialize a circular buffer for audio data.
        
        Args:
            duration_sec (int): Buffer duration in seconds.
            sample_rate (int): Audio sample rate (Hz).
            channels (int): Number of audio channels.
            dtype (expected numpy dtype): Data type of samples.
        """
        self.duration_sec = duration_sec
        self.sample_rate = sample_rate
        self.channels = channels
        self.dtype = dtype
        
        # Calculate total frames capacity
        self.capacity = int(duration_sec * sample_rate)
        
        # Pre-allocate buffer [frames, channels]
        self.buffer = np.zeros((self.capacity, self.channels), dtype=self.dtype)
        self.write_index = 0
        self.is_filled = False # Becomes True once we have wrapped around at least once
        self.lock = threading.Lock()

    def add_frame(self, frame):
        """
        Accepts an av.AudioFrame (or similar object with to_ndarray), 
        converts to numpy, and writes to buffer.
        """
        # Convert frame to numpy
        # frame.to_ndarray() usually returns:
        # - (channels, samples) for planar formats
        # - (samples, channels) for packed formats
        # We standarize to (samples, channels)
        
        if hasattr(frame, 'to_ndarray'):
            data = frame.to_ndarray()
        elif isinstance(frame, np.ndarray):
            data = frame
        else:
             raise ValueError("Unsupported frame type. Must be av.AudioFrame or np.ndarray")

        # Handle shape
        if data.ndim == 2:
             # Check if we need to transpose:
             # 1. If (Channels, Samples) e.g. (2, 480 or 1, 480)
             if data.shape[0] < data.shape[1]:
                 data = data.T # Becomes (Samples, Channels) e.g. (480, 2) or (480, 1)

             # Now data is likely (Samples, Channels).
             # Check for Mono -> Stereo mismatch
             if data.shape[1] == 1 and self.channels == 2:
                 # Input is (N, 1), Buffer is (N, 2). Tile it!
                 data = np.tile(data, (1, 2))
             
             # Check for raw shape mismatch just in case (e.g. 1 channel input that didn't get transposed correctly or other weirdness)
             # If we have (1, N) and we want (N, 2), valid above, but verify:
             
        elif data.ndim == 1:
            # Mono represented as 1D array, reshape to (samples, 1)
            data = data.reshape(-1, 1)
            # Handle Mono -> Stereo
            if self.channels == 2:
                 data = np.tile(data, (1, 2))

        num_samples = data.shape[0]
        
        with self.lock:
            # Handle wrapping
            if num_samples >= self.capacity:
                # If incoming chunk is larger than whole buffer, just take the last 'capacity' samples
                self.buffer[:] = data[-self.capacity:]
                self.write_index = 0
                self.is_filled = True
            else:
                end_index = self.write_index + num_samples
                
                if end_index <= self.capacity:
                    # No wrap
                    self.buffer[self.write_index:end_index] = data
                    self.write_index = end_index
                    if self.write_index == self.capacity:
                        self.write_index = 0
                        self.is_filled = True
                else:
                    # Wrap around
                    remaining = self.capacity - self.write_index
                    overflow = num_samples - remaining
                    
                    self.buffer[self.write_index:] = data[:remaining]
                    self.buffer[:overflow] = data[remaining:]
                    self.write_index = overflow
                    self.is_filled = True

    def get_buffer(self):
        """
        Returns the linear audio buffer [oldest ... newest].
        """
        with self.lock:
            if not self.is_filled:
                # Return only the valid data so far
                return self.buffer[:self.write_index].copy()
            else:
                # Roll the buffer so oldest starts at index 0
                return np.roll(self.buffer, -self.write_index, axis=0)

    def get_last_n_seconds(self, seconds):
        """Helper to get only the last N seconds"""
        num_frames = int(seconds * self.sample_rate)
        full_buffer = self.get_buffer()
        if len(full_buffer) < num_frames:
            return full_buffer
        return full_buffer[-num_frames:]
