from enum import Enum
from typing import Dict, Any, Optional

class ErrorSeverity(Enum):
    LOW = "low"           # Log and continue
    MEDIUM = "medium"     # Retry with fallback
    HIGH = "high"         # Alert and degrade gracefully
    CRITICAL = "critical" # Stop processing, alert admin

class StreamingError(Exception):
    """Base exception for streaming errors"""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.severity = severity
        self.recoverable = severity != ErrorSeverity.CRITICAL
        self.context = context or {}

class FrameValidationError(StreamingError):
    def __init__(self, message, context=None):
        super().__init__(message, severity=ErrorSeverity.LOW, context=context)

class InferenceError(StreamingError):
    def __init__(self, message, context=None):
        super().__init__(message, severity=ErrorSeverity.MEDIUM, context=context)

class ModelLoadError(StreamingError):
    def __init__(self, message, context=None):
        super().__init__(message, severity=ErrorSeverity.CRITICAL, context=context)
