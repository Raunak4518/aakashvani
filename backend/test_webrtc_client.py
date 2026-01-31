import asyncio
import aiohttp
import json
import logging
import numpy as np
import time
from fractions import Fraction
from aiortc import RTCPeerConnection, RTCSessionDescription, AudioStreamTrack
from aiortc.contrib.media import MediaPlayer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_client")

class SineWaveAudioTrack(AudioStreamTrack):
    """
    A simple audio track that generates a sine wave.
    """
    kind = "audio"

    def __init__(self):
        super().__init__()
        self.counter = 0
        self.sample_rate = 48000
        self.frequency = 440  # 440 Hz (A4)
        self.amplitude = 0.5

    async def recv(self):
        # Generate 20ms of audio
        frames = int(self.sample_rate * 0.02)
        t = np.linspace(
            self.counter / self.sample_rate,
            (self.counter + frames) / self.sample_rate,
            frames,
            endpoint=False
        )
        self.counter += frames
        
        # Generate sine wave (mono)
        audio = (self.amplitude * np.sin(2 * np.pi * self.frequency * t) * 32767).astype(np.int16)
        # Reshape to (1, N) for planar or (N, 1) for packed? 
        # For 's16' (packed), PyAV usually expects (1, N*channels) or (N, channels) for some versions.
        # But 's16p' (planar) expects (channels, N).
        # Let's try 's16p' and (1, N) for mono.
        audio = audio.reshape(1, -1)
        
        # Create AudioFrame using av
        try:
             from av import AudioFrame
             # For s16 (packed), data is (1, samples) for mono? Or just flat.
             # PyAV from_ndarray with s16 expects (1, samples) for mono usually.
             frame = AudioFrame.from_ndarray(audio, format='s16', layout='mono')
             frame.sample_rate = self.sample_rate
             frame.pts = self.counter
             frame.time_base = Fraction(1, self.sample_rate)
             
             # Simulate real-time delay
             await asyncio.sleep(0.02)
             
             return frame
        except ImportError:
            logger.error("av (PyAV) is required. Please install it.")
            raise

async def run_client():
    pc = RTCPeerConnection()
    
    # Create Data Channel
    dc = pc.createDataChannel("results")
    
    @dc.on("open")
    def on_open():
        logger.info("Data Channel OPEN")
        
    @dc.on("message")
    def on_message(message):
        logger.info(f"RECEIVED MESSAGE: {message}")
        try:
            data = json.loads(message)
            if data.get("type") == "detection_result":
                res = data.get("data")
                logger.info(f"SUCCESS: Detection Result -> Probability: {res.get('confidence')}% | Status: {res.get('status')}")
        except Exception as e:
            logger.error(f"Failed to parse message: {e}")

    # Add Audio Track
    track = SineWaveAudioTrack()
    pc.addTrack(track)
    
    # Create Offer
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    # Send to Backend
    async with aiohttp.ClientSession() as session:
        logger.info("Sending Offer to Backend...")
        async with session.post("http://localhost:8000/api/v1/webrtc/offer", json={
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type
        }) as resp:
            if resp.status != 200:
                logger.error(f"Backend Error: {resp.status} - {await resp.text()}")
                return
                
            answer_data = await resp.json()
            answer = RTCSessionDescription(sdp=answer_data["sdp"], type=answer_data["type"])
            await pc.setRemoteDescription(answer)
            logger.info("Remote Description Set. Connection Established.")

    # Keep alive for a while to test streaming
    logger.info("Streaming audio...")
    await asyncio.sleep(10) # Run for 10 seconds
    
    # Cleanup
    logger.info("Closing connection...")
    await pc.close()

if __name__ == "__main__":
    try:
        asyncio.run(run_client())
    except KeyboardInterrupt:
        pass
