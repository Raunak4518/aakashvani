from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

class DetectionResult(BaseModel):
    id: str
    timestamp: float
    status: Literal['authentic', 'deepfake', 'uncertain', 'analyzing']
    confidence: float
    duration: float
    method: str
    is_new: bool = False

class Session(BaseModel):
    id: str
    start_time: float
    status: Literal['idle', 'recording', 'paused', 'ended']
    detections: List[DetectionResult] = []
    sample_count: int = 0
    duration: int = 0

class LogEntry(BaseModel):
    timestamp: str  # Formatted string for UI
    level: Literal['INFO', 'WARN', 'ERROR', 'SUCCESS']
    message: str
    source: str = "System"

class Metrics(BaseModel):
    cpu_usage: float
    memory_usage: float
    latency: float
    network_quality: Literal['excellent', 'good', 'fair', 'poor']
    bandwidth_kbps: float
    packet_loss: float
    jitter: float
    confidence_trend: float

class Settings(BaseModel):
    sensitivity: int  # 0-3
    min_sample_length: int
    auto_adjust_quality: bool
    sound_alerts: bool
    visual_alerts: bool
    theme: str = 'dark'
