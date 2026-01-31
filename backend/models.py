from pydantic import BaseModel
from typing import List, Optional

class Metrics(BaseModel):
    cpu_usage: float
    memory_usage: float
    latency: float
    network_quality: str
    bandwidth_kbps: float
    packet_loss: float
    jitter: float
    confidence_trend: float

class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    source: str = "System"

class Settings(BaseModel):
    sensitivity: int = 1
    min_sample_length: int = 5
    auto_adjust_quality: bool = True
    sound_alerts: bool = True
    visual_alerts: bool = True

class DetectionResult(BaseModel):
    id: str
    timestamp: float
    status: str
    confidence: float
    duration: float
    method: str
    is_new: bool = True

class Session(BaseModel):
    id: str
    start_time: float
    status: str
    detections: List[DetectionResult] = []
    sample_count: int = 0
