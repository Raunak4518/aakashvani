from collections import defaultdict, deque
from typing import Dict, Any
import time
import logging
from config import StreamingConfig
from .errors import ErrorSeverity, StreamingError

logger = logging.getLogger("uvicorn")

class ErrorHandler:
    """Centralized error handling"""
    
    def __init__(self, config: StreamingConfig):
        self.config = config
        self.error_counts = defaultdict(int)
        self.error_history = deque(maxlen=100)
        
    def handle(self, error: Exception, context: Dict = None):
        """Handle error based on severity"""
        
        if isinstance(error, StreamingError):
            severity = error.severity
        else:
            severity = ErrorSeverity.MEDIUM
        
        # Log error
        self.log_error(error, severity, context)
        
        # Record metrics
        self.error_counts[type(error).__name__] += 1
        self.error_history.append({
            'timestamp': time.time(),
            'error': str(error),
            'severity': severity.value,
            'context': context
        })
        
        # Take action based on severity
        if severity == ErrorSeverity.CRITICAL:
            self.handle_critical(error)
        elif severity == ErrorSeverity.HIGH:
            self.handle_high(error)
        elif severity == ErrorSeverity.MEDIUM:
            self.handle_medium(error)
        else:
            self.handle_low(error)
            
    def log_error(self, error, severity, context):
         log_msg = f"[{severity.value.upper()}] {type(error).__name__}: {str(error)}"
         if context:
             log_msg += f" | Context: {context}"
             
         if severity == ErrorSeverity.CRITICAL:
             logger.critical(log_msg)
         elif severity == ErrorSeverity.HIGH or severity == ErrorSeverity.MEDIUM:
             logger.error(log_msg)
         else:
             logger.warning(log_msg)
    
    def handle_critical(self, error: Exception):
        """Critical errors: stop processing, alert"""
        # In a real system, send PagerDuty alert here
        raise error
    
    def handle_high(self, error: Exception):
        """High severity: enter degraded mode"""
        pass
        # Could set a global flag for degraded mode
    
    def handle_medium(self, error: Exception):
        """Medium severity: retry with backoff"""
        # Pass (logic handled by caller usually)
        pass
    
    def handle_low(self, error: Exception):
        """Low severity: log and continue"""
        pass
