import time
from datetime import datetime
import uuid
from typing import Optional, List
from models import Session, Settings, LogEntry, DetectionResult

class AppState:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AppState, cls).__new__(cls)
            cls._instance.init_state()
        return cls._instance

    def init_state(self):
        self.current_session: Optional[Session] = None
        self.settings = Settings(
            sensitivity=1,
            min_sample_length=5,
            auto_adjust_quality=True,
            sound_alerts=True,
            visual_alerts=True
        )
        self.logs: List[LogEntry] = []
        self.add_log("INFO", "System initialized", "System")

    def start_session(self):
        session_id = f"SES-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        self.current_session = Session(
            id=session_id,
            start_time=time.time() * 1000,
            status='recording'
        )
        self.add_log("INFO", f"Session started: {session_id}", "Session")
        return self.current_session

    def stop_session(self):
        if self.current_session:
            self.current_session.status = 'ended'
            self.add_log("INFO", f"Session ended: {self.current_session.id}", "Session")
        return self.current_session

    def add_detection(self, result: DetectionResult):
        if self.current_session:
            self.current_session.detections.append(result)
            self.current_session.sample_count += 1
            self.add_log("SUCCESS" if result.status == 'authentic' else "WARN", 
                         f"Detection: {result.status} ({int(result.confidence)}%)", "Detection")

    def add_log(self, level: str, message: str, source: str = "System"):
        from datetime import datetime
        entry = LogEntry(
            timestamp=datetime.now().strftime("%H:%M:%S"),
            level=level,
            message=message,
            source=source
        )
        self.logs.append(entry)
        # Keep last 1000 logs
        if len(self.logs) > 1000:
            self.logs.pop(0)

    def get_logs(self, limit: int = 100):
        return self.logs[-limit:][::-1]

# Global instance
db = AppState()
