import pytest
import asyncio
import numpy as np
from modules.audio.manager import AudioStreamManager
from config import StreamingConfig

def generate_test_frame(size=1920):
    return np.random.randn(1, size).astype(np.float32)

@pytest.mark.asyncio
async def test_high_load():
    """Test system under high load"""
    config = StreamingConfig()
    # Ensure mocked model for speed
    manager = AudioStreamManager(config)
    
    async def send_frames(num_frames):
        for _ in range(num_frames):
            frame = generate_test_frame()
            await manager.process_frame(frame)
            await asyncio.sleep(0.0001)  # Minimal sleep to allow context switch
    
    # Create multiple concurrent streams?
    # AudioStreamManager is technically 1 instance per stream unless shared.
    # The user test implies testing one manager under potential load or multiple managers?
    # "Create multiple concurrent streams" usually means multiple MANAGERS.
    # BUT if we test 1 manager with high frame rate (burst), that's one thing.
    # If tasks share the manager, that mimics race conditions on locks.
    # Let's assume shared manager to test thread safety of Buffer/Infer.
    
    tasks = [send_frames(100) for _ in range(5)] # 5 concurrent pushers
    await asyncio.gather(*tasks)
    
    # Check metrics
    stats = manager.metrics.metrics
    # print(stats)
    # Just ensure no system crashes
    assert stats.get('system_errors', 0) == 0
