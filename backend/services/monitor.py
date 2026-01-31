import psutil
import random
import time
from models import Metrics

def get_system_metrics() -> Metrics:
    # Simulate realistic network fluctuation
    latency_base = 45 if random.random() > 0.1 else 150
    jitter = random.uniform(2, 15)
    
    return Metrics(
        cpu_usage=psutil.cpu_percent(),
        memory_usage=psutil.virtual_memory().percent,
        latency=latency_base + random.uniform(-10, 10),
        network_quality="excellent" if latency_base < 60 else "good",
        bandwidth_kbps=random.uniform(40, 80),
        packet_loss=0.0 if random.random() > 0.05 else 0.2,
        jitter=jitter,
        confidence_trend=random.uniform(-2, 5)
    )
