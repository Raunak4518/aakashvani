from fastapi import APIRouter
from typing import List
from models import Metrics, LogEntry
from services.monitor import get_system_metrics
from services.state import db

router = APIRouter(prefix="/api/v1/system", tags=["System"])

@router.get("/metrics", response_model=Metrics)
async def get_metrics():
    return get_system_metrics()

@router.get("/logs", response_model=List[LogEntry])
async def get_logs(limit: int = 50):
    return db.get_logs(limit)
