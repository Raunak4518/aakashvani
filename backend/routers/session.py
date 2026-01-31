from fastapi import APIRouter
from typing import List, Optional
from models import Session, DetectionResult
from services.state import db

router = APIRouter(prefix="/api/v1/session", tags=["Session"])

@router.post("/start", response_model=Session)
async def start_session():
    return db.start_session()

@router.post("/stop", response_model=Optional[Session])
async def stop_session():
    return db.stop_session()

@router.get("/current", response_model=Optional[Session])
async def get_current_session():
    return db.current_session

@router.get("/history", response_model=List[DetectionResult])
async def get_history():
    if db.current_session:
        return db.current_session.detections[::-1] # Newest first
    return []
