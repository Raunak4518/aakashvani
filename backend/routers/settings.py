from fastapi import APIRouter
from models import Settings
from services.state import db

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

@router.get("/", response_model=Settings)
async def get_settings():
    return db.settings

@router.post("/", response_model=Settings)
async def update_settings(settings: Settings):
    db.settings = settings
    db.add_log("INFO", "Settings updated", "User")
    return db.settings
