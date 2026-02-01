from dataclasses import dataclass
from typing import Optional
import torch

@dataclass
class StreamingConfig:
    """Central configuration for streaming system"""
    
    # Audio parameters
    sample_rate: int = 16000
    frame_size: int = 1920  # ~120ms at 16kHz
    buffer_size: int = 64000  # 4 seconds
    
    # Inference parameters
    inference_window_size: int = 64000
    inference_stride: int = 16000  # 1 second stride
    min_audio_length: int = 16000  # 1 second minimum
    
    # Model parameters
    model_path: str = "best_model.pt"
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    use_fp16: bool = False
    use_torchscript: bool = False
    
    # Queue parameters
    queue_size: int = 10
    inference_timeout: float = 5.0  # seconds
    num_workers: int = 2
    
    # Detection parameters
    threshold: float = 0.5
    aggregation_window: int = 5  # Number of scores to aggregate
    confidence_threshold: float = 0.7
    
    # Alert parameters
    alert_cooldown: float = 10.0  # seconds between alerts
    max_alerts_per_minute: int = 6
    
    # Performance parameters
    max_latency: float = 1.0  # seconds
    drop_on_queue_full: bool = True
    enable_metrics: bool = True
    
    # Robust Audio Processing parameters
    preprocessing_mode: str = "voip"  # "voip", "clean", or "aggressive"
    noise_reduction_aggressiveness: float = 0.3  # 0.0 to 1.0
    enable_packet_loss_concealment: bool = True
    enable_codec_artifact_reduction: bool = True
    enable_adaptive_gain: bool = True
    quality_check_interval: int = 10  # Check quality every N frames
    
    # Logging
    log_level: str = "INFO"
    log_file: Optional[str] = "streaming_antispoofing.log"
    
    @classmethod
    def from_file(cls, path: str) -> 'StreamingConfig':
        """Load config from YAML/JSON file"""
        # Placeholder for implementation
        return cls()
    
    def validate(self):
        """Validate configuration consistency"""
        assert self.frame_size > 0
        assert self.buffer_size >= self.inference_window_size
        assert 0 <= self.threshold <= 1
