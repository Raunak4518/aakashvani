import asyncio
import time
import uuid
import logging
from av import AudioFrame

# Modules
from modules.audio.manager import AudioStreamManager
from config import StreamingConfig
import uuid

logger = logging.getLogger("uvicorn")

class AudioConsumer:
    """
    Consumers an audio track, delegating processing to AudioStreamManager.
    """
    def __init__(self, track, data_channel):
        self.id = str(uuid.uuid4())[:8]
        self.track = track
        self.running = False
        self.processing_task = None
        self.stream_manager = AudioStreamManager(StreamingConfig())
        self.response_handler = None
        self.data_channel = data_channel
        
        # We need a way to send data. Manager has a response_handler but it needs the data channel.
        # But Manager's handler in my impl currently doesn't hold the channel (I passed None).
        # Let's handle sending here or inject channel into manager.
        # Updated approach: Consumer handles sending, manager returns payload.
        
    def set_data_channel(self, data_channel):
        print(f"STEP 5.1: Associated Data Channel with Consumer [{self.id}]")
        self.data_channel = data_channel
        
    def start(self):
        print(f"STEP 4.1: Starting Audio Consumer Task [{self.id}]")
        self.running = True
        self.processing_task = asyncio.create_task(self._consume())

    def stop(self):
        print(f"STEP X: Stopping Audio Consumer Task [{self.id}]")
        self.running = False
        if self.processing_task:
            self.processing_task.cancel()

    async def _consume(self):
        logger.info(f"Started WebRTC Audio Consumer [{self.id}]")
        frame_count = 0
        
        try:
            while self.running:
                try:
                    frame = await self.track.recv()
                    frame_count += 1
                except Exception as e:
                    print(f"STEP ERROR [{self.id}]: Track ended/error: {e}")
                    break
                
                # Process via Manager
                try:
                    # Preprocess raw data to prevalidator needed? Manager handles it.
                    # Note: process_frame(frame) allows manager to validate frame object.
                    # We pass numpy data + object or just object?
                    # My Manager.process_frame signature: (frame: np.ndarray, frame_obj=None)
                    # Let's perform the basic conversion here to ensure we pass what it expects.
                    
                    data = frame.to_ndarray()
                    
                    # Call manager
                    response = await self.stream_manager.process_frame(data, frame_obj=frame)
                    
                    if response:
                         # Send Result
                        if self.data_channel and self.data_channel.readyState == "open":
                            import json
                            # Wrap in detection_result specific format expected by frontend
                            # The response is dict with timestamp, score, etc.
                            # Frontend expects: type: "detection_result", data: { ... }
                            
                            payload = {
                                "type": "detection_result",
                                "data": {
                                    "id": f"DET-{int(response['timestamp']*1000)}",
                                    "timestamp": response['timestamp'] * 1000,
                                    "status": "deepfake" if response['is_spoof'] else "authentic",
                                    "confidence": response['confidence'],
                                    "duration": 0.0, # N/A
                                    "method": "Streaming-Transformer",
                                    "is_new": True
                                }
                            }
                            self.data_channel.send(json.dumps(payload))
                            
                            if response.get('alert'):
                                self.data_channel.send(json.dumps({"type": "alert", "data": response['alert']}))

                except Exception as e:
                    logger.error(f"Processing Error [{self.id}]: {e}")
                    pass
                    
        except asyncio.CancelledError:
            logger.info(f"Audio Consumer [{self.id}] Cancelled")
        except Exception as e:
            logger.error(f"Error in Audio Consumer [{self.id}]: {e}")
        finally:
            print(f"STEP X: Consumer loop [{self.id}] exited")
            logger.info(f"Stopped WebRTC Audio Consumer [{self.id}]")

# Global manager to keep track of connections
consumers = set()
