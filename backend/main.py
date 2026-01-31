from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import random
import time
from routers import system, session, settings
from services.state import db
from models import DetectionResult

app = FastAPI(title="Aakashvani Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(session.router)
app.include_router(settings.router)
from routers import webrtc
app.include_router(webrtc.router)

@app.get("/")
async def get():
    return {"message": "Aakashvani Backend Running"}


