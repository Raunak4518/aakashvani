import pytest
import numpy as np
import asyncio
from modules.audio.manager import AudioStreamManager
from config import StreamingConfig

def generate_test_frame(size=1920):
    return np.random.randn(1, size).astype(np.float32)

@pytest.mark.asyncio
async def test_end_to_end_pipeline():
    """Test complete pipeline"""
    config = StreamingConfig()
    # Mock model manager inside to avoid loading real weights?
    # Or rely on mock fallbacks
    manager = AudioStreamManager(config)
    
    # Simulate streaming
    # Buffer is 64000, frame 1920. Need ~34 frames to start inference
    frames_sent = 0
    got_result = False
    
    for i in range(50):
        frame = generate_test_frame()
        result = await manager.process_frame(frame)
        frames_sent += 1
        
        if result:
            got_result = True
            assert 'score' in result
            assert 'timestamp' in result
            assert 0.0 <= result['score'] <= 1.0
            
    assert got_result, "Pipeline did not produce any result"

@pytest.mark.asyncio
async def test_error_recovery():
    """Test system recovery from errors"""
    config = StreamingConfig()
    manager = AudioStreamManager(config)
    
    # Inject corrupted frame (NaN)
    bad_frame = np.zeros((1, 1920), dtype=np.float32)
    bad_frame[:] = np.nan
    
    # Should handle gracefully (return None, validator catches it)
    result = await manager.process_frame(bad_frame)
    assert result is None
    
    # Verify metric logged
    # assert manager.metrics.metrics['invalid_frames'] > 0
    # manager.metrics is dict in my impl? 
    # My MetricsCollector has .metrics dict
    assert manager.metrics.metrics.get('invalid_frames', 0) > 0
    
    # Next valid frame should work (continuing buffer fill)
    for _ in range(40): # Send enough to fill buffer
        good_frame = generate_test_frame()
        result = await manager.process_frame(good_frame)
        if result: 
            break
            
    assert result is not None, "System failed to recover"
