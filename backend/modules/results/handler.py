import json
import logging

logger = logging.getLogger("uvicorn")

class ResponseHandler:
    """Sends results back to client"""
    
    def __init__(self, data_channel):
        self.data_channel = data_channel
        
    def set_channel(self, channel):
        self.data_channel = channel
        
    def send_result(self, result: dict):
        if self.data_channel and self.data_channel.readyState == "open":
            try:
                msg = json.dumps(result)
                self.data_channel.send(msg)
            except Exception as e:
                logger.error(f"Failed to send DataChannel message: {e}")
