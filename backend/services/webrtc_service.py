import asyncio
import json
import time
import random
import logging
from av import AudioFrame
from aiortc import MediaStreamTrack
from models import DetectionResult
from services.state import db

logger = logging.getLogger("uvicorn")

class AudioConsumer:
    """
    Consumers an audio track, performs (simulated) inference,
    and sends results back via the DataChannel.
    """
    def __init__(self, track, data_channel):
        self.track = track
        self.data_channel = data_channel
        self.processing_task = None
        self.running = False
        
    def start(self):
        print("STEP 4.1: Starting Audio Consumer Task")
        self.running = True
        self.processing_task = asyncio.create_task(self._consume())

    def stop(self):
        print("STEP X: Stopping Audio Consumer Task")
        self.running = False
        if self.processing_task:
            self.processing_task.cancel()

    def set_data_channel(self, data_channel):
        print("STEP 5.1: Associated Data Channel with Consumer")
        self.data_channel = data_channel

    async def _consume(self):
        logger.info("Started WebRTC Audio Consumer")
        frame_count = 0
        
        try:
            while self.running:
                # 1. Receive Raw Audio Frame
                try:
                    # This returns an av.AudioFrame
                    frame = await self.track.recv()
                    frame_count += 1
                except Exception as e:
                    # Track might be closed
                    print(f"STEP ERROR: Error receiving frame: {e}")
                    logger.warning(f"Error receiving frame: {e}")
                    break
                
                # 2. Process every N frames to simulate real-time windowing (e.g. every 10 frames approx 200ms)
                if frame_count % 50 == 0: # Log every 50 frames to avoid spam but show activity
                     print(f"STEP 6 Loop: Processing Audio Batch {frame_count}...")
                
                if frame_count % 10 == 0:
                    await self._process_window(frame)
                    
        except asyncio.CancelledError:
            logger.info("Audio Consumer Cancelled")
        except Exception as e:
            logger.error(f"Error in Audio Consumer: {e}")
        finally:
            print("STEP X: Consumer loop exited")
            logger.info("Stopped WebRTC Audio Consumer")

    async def _process_window(self, frame):
        # Placeholder for real inference
        # frame.to_ndarray() would get us the numpy array
        
        # Simulate latency
        await asyncio.sleep(0.05) 
        
        # Mock Result
        is_deepfake_prob = random.random()
        is_deepfake = is_deepfake_prob < 0.2 # 20% mock chance
        confidence = (random.uniform(80, 99) if is_deepfake else random.uniform(85, 99))
        
        result = DetectionResult(
            id=f"W-DET-{int(time.time()*1000)}",
            timestamp=time.time() * 1000,
            status='deepfake' if is_deepfake else 'authentic',
            confidence=confidence,
            duration=0.2,
            method="WebRTC-Live",
            is_new=True
        )
        
        # Log to DB
        if db.current_session and db.current_session.status == 'recording':
            db.add_detection(result)
            
        # Send via Data Channel
        if self.data_channel and self.data_channel.readyState == "open":
            try:
                # print(f"STEP 7: Sending Result via DataChannel: {result.status} {result.confidence:.1f}%")
                msg = json.dumps({
                    "type": "detection_result",
                    "data": result.dict()
                })
                self.data_channel.send(msg)
            except Exception as e:
                print(f"STEP ERROR: Failed to send DataChannel message: {e}")
                logger.error(f"Failed to send DataChannel message: {e}")
        else:
             print("STEP WARNING: Cannot send result, Data Channel NOT open")
             # logger.debug("Data channel not open yet")
             pass

# Global manager to keep track of connections if needed
consumers = set()
