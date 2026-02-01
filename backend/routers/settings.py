from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from models import Settings
from services.state import db

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


class AudioProcessingSettings(BaseModel):
    """Settings for audio preprocessing"""
    mode: str = "voip"  # "voip", "clean", "aggressive"
    aggressiveness: float = 0.3  # 0.0 to 1.0
    enable_noise_reduction: bool = True
    enable_packet_loss_concealment: bool = True
    enable_codec_artifact_reduction: bool = True


class AudioQualityReport(BaseModel):
    """Audio quality metrics report"""
    snr_estimate: float = 0.0
    packet_loss_ratio: float = 0.0
    codec_artifact_level: float = 0.0
    is_voip: bool = False
    quality_score: float = 1.0
    processing_mode: str = "voip"
    avg_processing_time_ms: float = 0.0


@router.get("/", response_model=Settings)
async def get_settings():
    return db.settings


@router.post("/", response_model=Settings)
async def update_settings(settings: Settings):
    db.settings = settings
    db.add_log("INFO", "Settings updated", "User")
    return db.settings


@router.get("/audio-processing", response_model=AudioProcessingSettings)
async def get_audio_processing_settings():
    """Get current audio processing settings"""
    return AudioProcessingSettings(
        mode=db.audio_processing_mode if hasattr(db, 'audio_processing_mode') else "voip",
        aggressiveness=db.audio_aggressiveness if hasattr(db, 'audio_aggressiveness') else 0.3
    )


@router.post("/audio-processing", response_model=AudioProcessingSettings)
async def update_audio_processing_settings(settings: AudioProcessingSettings):
    """
    Update audio processing settings.
    
    Modes:
    - "voip": Optimized for VoIP calls (packet loss, codec artifacts, echo)
    - "clean": Minimal processing for high-quality audio
    - "aggressive": Maximum noise reduction for noisy environments
    
    Aggressiveness: 0.0 (light) to 1.0 (heavy noise reduction)
    """
    db.audio_processing_mode = settings.mode
    db.audio_aggressiveness = settings.aggressiveness
    db.add_log("INFO", f"Audio processing mode changed to: {settings.mode}", "User")
    return settings


@router.get("/audio-quality", response_model=AudioQualityReport)
async def get_audio_quality():
    """
    Get current audio quality metrics.
    
    Returns quality indicators like SNR, packet loss, codec artifacts.
    Useful for diagnosing audio issues affecting detection accuracy.
    """
    # This would be populated by the active audio stream manager
    return AudioQualityReport(
        snr_estimate=getattr(db, 'audio_snr', 0.0),
        packet_loss_ratio=getattr(db, 'audio_packet_loss', 0.0),
        codec_artifact_level=getattr(db, 'audio_codec_artifacts', 0.0),
        is_voip=getattr(db, 'audio_is_voip', False),
        quality_score=getattr(db, 'audio_quality_score', 1.0),
        processing_mode=getattr(db, 'audio_processing_mode', "voip"),
        avg_processing_time_ms=getattr(db, 'audio_processing_time', 0.0)
    )
