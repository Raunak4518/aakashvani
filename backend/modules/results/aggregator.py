from collections import deque
import numpy as np

class ScoreAggregator:
    """Aggregates scores over time for stability"""
    
    def __init__(self, window_size=5):
        self.history = deque(maxlen=window_size)
    
    def add_score(self, score: float) -> float:
        """
        Add new score and return smoothed average.
        """
        self.history.append(score)
        return float(np.mean(self.history))
        
    def get_trend(self) -> float:
        """Simple trend: last - first"""
        if len(self.history) < 2:
            return 0.0
        return self.history[-1] - self.history[0]
