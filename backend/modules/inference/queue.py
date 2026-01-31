import asyncio
import logging

logger = logging.getLogger("uvicorn")

class InferenceQueue:
    """Manages async inference requests"""
    
    def __init__(self, max_size=10):
        self.queue = asyncio.Queue(maxsize=max_size)
    
    async def put(self, item):
        try:
            if self.queue.full():
                # Drop oldest item
                try:
                    self.queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            await self.queue.put(item)
        except Exception as e:
            logger.error(f"Queue error: {e}")

    async def get(self):
        return await self.queue.get()
