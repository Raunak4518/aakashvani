import logging
import time

logger = logging.getLogger("uvicorn")

class AlertManager:
    """Manages alerts and notifications"""
    
    def __init__(self, threshold=0.7, min_duration=3):
        self.threshold = threshold
        self.min_duration = min_duration # consecutive detections
        self.consecutive_count = 0
        self.last_alert_time = 0
        
    def check_alert(self, smoothed_score: float):
        """
        Check if an alert should be triggered.
        Returns:
            dict or None: Alert object if triggered
        """
        if smoothed_score > self.threshold:
            self.consecutive_count += 1
        else:
            self.consecutive_count = 0
            
        if self.consecutive_count >= self.min_duration:
            # Throttle alerts?
            if time.time() - self.last_alert_time > 2.0:
                self.last_alert_time = time.time()
                return {
                    "type": "DEEPFAKE_ALERT",
                    "severity": "high",
                    "score": smoothed_score,
                    "message": "High probability of deepfake audio detected!"
                }
        return None
