"""
Real-Time VoIP Simulation and Streaming Detection
================================================

Simulates real-time VoIP call scenarios with:
- Live audio streaming
- Network degradation
- Chunk-based processing
- Latency measurement
"""

import numpy as np
import librosa
import soundfile as sf
import time
from typing import Generator, Tuple, Optional, List
from collections import deque
import threading
import queue

class AudioStreamBuffer:
    """Buffer for managing streaming audio with overlap"""
    
    def __init__(self, chunk_duration: float = 3.0, 
                 overlap: float = 0.5,
                 sample_rate: int = 16000):
        """
        Args:
            chunk_duration: Duration of each chunk in seconds
            overlap: Overlap ratio (0-1) between consecutive chunks
            sample_rate: Audio sample rate
        """
        self.chunk_duration = chunk_duration
        self.overlap = overlap
        self.sample_rate = sample_rate
        
        self.chunk_samples = int(chunk_duration * sample_rate)
        self.overlap_samples = int(self.chunk_samples * overlap)
        self.stride_samples = self.chunk_samples - self.overlap_samples
        
        self.buffer = deque(maxlen=self.chunk_samples * 2)
        
    def add_samples(self, samples: np.ndarray):
        """Add new audio samples to buffer"""
        self.buffer.extend(samples)
    
    def get_chunk(self) -> Optional[np.ndarray]:
        """Get next chunk if enough samples available"""
        if len(self.buffer) >= self.chunk_samples:
            chunk = np.array(list(self.buffer)[:self.chunk_samples])
            
            # Remove processed samples (accounting for overlap)
            for _ in range(self.stride_samples):
                if len(self.buffer) > 0:
                    self.buffer.popleft()
            
            return chunk
        return None
    
    def has_chunk(self) -> bool:
        """Check if full chunk is available"""
        return len(self.buffer) >= self.chunk_samples
    
    def clear(self):
        """Clear buffer"""
        self.buffer.clear()


class VoIPSimulator:
    """Simulates VoIP call conditions with network impairments"""
    
    def __init__(self, packet_loss_rate: float = 0.02,
                 jitter_ms: float = 20.0,
                 codec: str = 'opus',
                 bandwidth_kbps: float = 32.0):
        """
        Args:
            packet_loss_rate: Packet loss probability (0-1)
            jitter_ms: Network jitter in milliseconds
            codec: Codec type ('opus', 'g711', 'clean')
            bandwidth_kbps: Available bandwidth in kbps
        """
        self.packet_loss_rate = packet_loss_rate
        self.jitter_ms = jitter_ms
        self.codec = codec
        self.bandwidth_kbps = bandwidth_kbps
        
        # VoIP packet parameters
        self.packet_duration_ms = 20  # Standard 20ms packets
        self.packet_size_samples = None
        
    def simulate_network(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """Apply network impairments to audio"""
        
        self.packet_size_samples = int((self.packet_duration_ms / 1000.0) * sr)
        degraded = audio.copy()
        num_packets = len(audio) // self.packet_size_samples
        
        # Simulate packet loss
        lost_packets = []
        for i in range(num_packets):
            if np.random.random() < self.packet_loss_rate:
                lost_packets.append(i)
                start = i * self.packet_size_samples
                end = min(start + self.packet_size_samples, len(degraded))
                
                # Simple packet loss concealment
                if i > 0:
                    # Repeat last packet
                    prev_start = (i - 1) * self.packet_size_samples
                    prev_end = prev_start + self.packet_size_samples
                    if prev_end <= len(degraded):
                        degraded[start:end] = degraded[prev_start:prev_end][:end-start]
                else:
                    degraded[start:end] = 0
        
        # Simulate jitter (time-varying delay)
        if self.jitter_ms > 0:
            jitter_samples = int((self.jitter_ms / 1000.0) * sr)
            jitter_offset = np.random.randint(-jitter_samples, jitter_samples)
            
            if jitter_offset > 0:
                degraded = np.pad(degraded, (jitter_offset, 0), mode='constant')[:-jitter_offset]
            elif jitter_offset < 0:
                degraded = np.pad(degraded, (0, -jitter_offset), mode='constant')[-jitter_offset:]
        
        # Codec simulation
        degraded = self._apply_codec(degraded, sr)
        
        # Add background noise (simulating microphone/environment)
        noise_level = 0.002
        noise = np.random.normal(0, noise_level, len(degraded))
        degraded = degraded + noise
        
        # Clip to valid range
        degraded = np.clip(degraded, -1.0, 1.0)
        
        return degraded
    
    def _apply_codec(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """Simulate codec compression"""
        
        if self.codec == 'g711':
            # μ-law compression (64 kbps)
            mu = 255
            compressed = np.sign(audio) * np.log(1 + mu * np.abs(audio)) / np.log(1 + mu)
            quantized = np.round(compressed * 127) / 127
            decompressed = np.sign(quantized) * (np.power(1 + mu, np.abs(quantized)) - 1) / mu
            return decompressed
            
        elif self.codec == 'opus':
            # Simplified Opus simulation
            from scipy.signal import butter, filtfilt
            
            # Bandwidth limitation based on bitrate
            if self.bandwidth_kbps <= 16:
                cutoff_hz = 4000  # Narrowband
            elif self.bandwidth_kbps <= 24:
                cutoff_hz = 6000  # Mediumband
            elif self.bandwidth_kbps <= 32:
                cutoff_hz = 8000  # Wideband
            else:
                cutoff_hz = 12000  # Super-wideband
            
            nyq = sr / 2
            if cutoff_hz < nyq:
                cutoff_norm = cutoff_hz / nyq
                b, a = butter(5, cutoff_norm, btype='low')
                audio = filtfilt(b, a, audio)
            
            # Quantization based on bitrate
            bits = max(8, int(self.bandwidth_kbps / 4))
            levels = 2 ** bits
            quantized = np.round(audio * levels/2) / (levels/2)
            
            return quantized
        
        else:  # 'clean'
            return audio


class RealtimeStreamProcessor:
    """Process audio stream in real-time with deepfake detection"""
    
    def __init__(self, detector, 
                 chunk_duration: float = 3.0,
                 sample_rate: int = 16000,
                 voip_config: Optional[dict] = None):
        """
        Args:
            detector: DeepfakeDetector instance
            chunk_duration: Duration of processing chunks
            sample_rate: Audio sample rate
            voip_config: VoIP simulation configuration
        """
        self.detector = detector
        self.chunk_duration = chunk_duration
        self.sample_rate = sample_rate
        
        self.buffer = AudioStreamBuffer(
            chunk_duration=chunk_duration,
            overlap=0.3,
            sample_rate=sample_rate
        )
        
        # VoIP simulator
        voip_config = voip_config or {}
        self.voip_sim = VoIPSimulator(**voip_config)
        
        # Performance metrics
        self.processing_times = []
        self.detection_results = []
        
    def stream_from_file(self, audio_file: str, 
                        apply_voip: bool = True) -> Generator[Tuple[np.ndarray, Dict, float], None, None]:
        """
        Stream audio from file in real-time fashion
        
        Yields:
            (audio_chunk, detection_result, processing_time)
        """
        
        # Load audio
        audio, sr = librosa.load(audio_file, sr=self.sample_rate, mono=True)
        
        # Apply VoIP degradation if requested
        if apply_voip:
            audio = self.voip_sim.simulate_network(audio, sr)
        
        # Stream in chunks
        chunk_size = int(0.1 * sr)  # 100ms chunks (realistic streaming)
        
        for i in range(0, len(audio), chunk_size):
            chunk = audio[i:i+chunk_size]
            self.buffer.add_samples(chunk)
            
            # Process when enough data available
            if self.buffer.has_chunk():
                processing_chunk = self.buffer.get_chunk()
                
                # Time the detection
                start_time = time.time()
                result = self.detector.detect(processing_chunk, sr)
                processing_time = time.time() - start_time
                
                self.processing_times.append(processing_time)
                self.detection_results.append(result)
                
                yield processing_chunk, result, processing_time
            
            # Simulate real-time streaming delay
            time.sleep(chunk_size / sr * 0.8)  # 80% real-time
    
    def process_live_stream(self, audio_queue: queue.Queue,
                           result_queue: queue.Queue,
                           stop_event: threading.Event):
        """
        Process live audio stream from a queue (for real microphone input)
        
        Args:
            audio_queue: Queue receiving audio chunks
            result_queue: Queue for sending detection results
            stop_event: Event to signal processing stop
        """
        
        while not stop_event.is_set():
            try:
                # Get audio chunk with timeout
                chunk = audio_queue.get(timeout=0.1)
                
                # Add to buffer
                self.buffer.add_samples(chunk)
                
                # Process if enough data
                if self.buffer.has_chunk():
                    processing_chunk = self.buffer.get_chunk()
                    
                    start_time = time.time()
                    result = self.detector.detect(processing_chunk, self.sample_rate)
                    processing_time = time.time() - start_time
                    
                    self.processing_times.append(processing_time)
                    self.detection_results.append(result)
                    
                    # Send result
                    result_queue.put({
                        'result': result,
                        'processing_time': processing_time,
                        'timestamp': time.time()
                    })
                    
            except queue.Empty:
                continue
    
    def get_performance_stats(self) -> dict:
        """Get processing performance statistics"""
        
        if not self.processing_times:
            return {}
        
        processing_times = np.array(self.processing_times)
        
        stats = {
            'mean_latency_ms': np.mean(processing_times) * 1000,
            'median_latency_ms': np.median(processing_times) * 1000,
            'p95_latency_ms': np.percentile(processing_times, 95) * 1000,
            'p99_latency_ms': np.percentile(processing_times, 99) * 1000,
            'max_latency_ms': np.max(processing_times) * 1000,
            'throughput_chunks_per_sec': 1.0 / (np.mean(processing_times) + 1e-10),
            'total_chunks_processed': len(self.processing_times)
        }
        
        # Detection statistics
        if self.detection_results:
            deepfake_count = sum(1 for r in self.detection_results if r['is_deepfake'])
            stats['deepfake_detection_rate'] = deepfake_count / len(self.detection_results)
            stats['mean_detection_score'] = np.mean([r['overall_score'] 
                                                     for r in self.detection_results])
        
        return stats


class CallSessionSimulator:
    """Simulates a complete VoIP call session"""
    
    def __init__(self, detector, voip_config: Optional[dict] = None):
        self.detector = detector
        self.stream_processor = RealtimeStreamProcessor(
            detector=detector,
            voip_config=voip_config
        )
        
        self.session_results = []
        
    def simulate_call(self, audio_files: List[str], 
                     labels: List[bool],
                     apply_voip: bool = True) -> dict:
        """
        Simulate complete call session with multiple speakers
        
        Args:
            audio_files: List of audio file paths
            labels: True labels (True=deepfake, False=genuine)
            apply_voip: Whether to apply VoIP degradation
            
        Returns:
            Session results with metrics
        """
        
        print("Simulating VoIP Call Session...")
        print("=" * 60)
        
        results = []
        
        for i, (audio_file, true_label) in enumerate(zip(audio_files, labels)):
            print(f"\nProcessing segment {i+1}/{len(audio_files)}: {audio_file}")
            print(f"  True label: {'DEEPFAKE' if true_label else 'GENUINE'}")
            
            segment_results = []
            
            # Stream and process
            for chunk, result, proc_time in self.stream_processor.stream_from_file(
                audio_file, apply_voip=apply_voip
            ):
                segment_results.append(result)
                
                # Print real-time updates
                status = "🚨 DEEPFAKE" if result['is_deepfake'] else "✓ GENUINE"
                print(f"    {status} | Score: {result['overall_score']:.3f} | "
                      f"Latency: {proc_time*1000:.1f}ms", end='\r')
            
            # Aggregate segment results
            if segment_results:
                avg_score = np.mean([r['overall_score'] for r in segment_results])
                final_decision = avg_score >= self.detector.deepfake_threshold
                
                results.append({
                    'file': audio_file,
                    'true_label': true_label,
                    'predicted_label': final_decision,
                    'average_score': avg_score,
                    'num_chunks': len(segment_results),
                    'chunk_results': segment_results
                })
                
                print(f"\n  Final: {'DEEPFAKE' if final_decision else 'GENUINE'} "
                      f"(avg score: {avg_score:.3f})")
        
        # Calculate session metrics
        correct = sum(1 for r in results if r['true_label'] == r['predicted_label'])
        accuracy = correct / len(results) if results else 0
        
        true_positives = sum(1 for r in results if r['true_label'] and r['predicted_label'])
        false_positives = sum(1 for r in results if not r['true_label'] and r['predicted_label'])
        true_negatives = sum(1 for r in results if not r['true_label'] and not r['predicted_label'])
        false_negatives = sum(1 for r in results if r['true_label'] and not r['predicted_label'])
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        session_summary = {
            'total_segments': len(results),
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'true_positives': true_positives,
            'false_positives': false_positives,
            'true_negatives': true_negatives,
            'false_negatives': false_negatives,
            'performance_stats': self.stream_processor.get_performance_stats(),
            'segment_results': results
        }
        
        self.session_results = results
        
        return session_summary


if __name__ == "__main__":
    print("VoIP Simulation and Streaming Detection Module")
    print("=" * 50)
    
    # Test VoIP simulator
    print("\n1. Testing VoIP Network Simulator...")
    voip_sim = VoIPSimulator(
        packet_loss_rate=0.02,
        jitter_ms=20,
        codec='opus',
        bandwidth_kbps=32
    )
    print("  ✓ VoIP simulator initialized")
    print(f"    - Packet loss: 2%")
    print(f"    - Jitter: 20ms")
    print(f"    - Codec: Opus @ 32kbps")
    
    # Test audio buffer
    print("\n2. Testing Audio Stream Buffer...")
    buffer = AudioStreamBuffer(chunk_duration=3.0, overlap=0.3)
    print("  ✓ Stream buffer initialized")
    print(f"    - Chunk duration: 3.0s")
    print(f"    - Overlap: 30%")
    
    print("\n✓ All components ready for real-time processing")
