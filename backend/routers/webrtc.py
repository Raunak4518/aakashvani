from fastapi import APIRouter, Body
from aiortc import RTCPeerConnection, RTCSessionDescription
from pydantic import BaseModel
import asyncio
import logging
from services.webrtc_service import AudioConsumer, consumers

router = APIRouter(prefix="/api/v1/webrtc", tags=["WebRTC"])
logger = logging.getLogger("uvicorn")

class Offer(BaseModel):
    sdp: str
    type: str

@router.post("/offer")
async def offer(offer_data: Offer):
    print("----------------------------------------------------------------")
    print("STEP 1: Received WebRTC Offer Request")
    logger.info("Received WebRTC Offer Request")
    offer = RTCSessionDescription(sdp=offer_data.sdp, type=offer_data.type)
    
    pc = RTCPeerConnection()
    pc.audio_consumers = []
    print("STEP 2: Created RTCPeerConnection")
    
    @pc.on("datachannel")
    def on_datachannel(channel):
        print(f"STEP 5 (Async): Data channel opened: {channel.label}")
        logger.info(f"Data channel opened: {channel.label}")
        pc.data_channel = channel
        for consumer in pc.audio_consumers:
            consumer.set_data_channel(channel)

    @pc.on("track")
    def on_track(track):
        if track.kind == "audio":
            print("STEP 4 (Async): Audio track received")
            logger.info("Audio track received")
            
            # Create consumer with existing data channel (if any)
            consumer = AudioConsumer(track, getattr(pc, 'data_channel', None))
            pc.audio_consumers.append(consumer)
            consumers.add(consumer)
            consumer.start()
            
            @track.on("ended")
            async def on_ended():
                print("STEP X: Track ended")
                logger.info("Track ended")
                consumer.stop()
                consumers.discard(consumer)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"STEP Y (Async): Connection state changed: {pc.connectionState}")
        logger.info(f"Connection state: {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            await pc.close()

    # Handle the offer
    await pc.setRemoteDescription(offer)
    print("STEP 3: Remote Description Set")
    
    # Send Answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    print("STEP 3.5: Generated Answer, Sending back to Client")
    
    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
