"""
Advanced Audio Preprocessor for Robust Deepfake Detection

Handles:
- Network quality issues (packet loss, jitter, codec artifacts)
- VoIP call noise (compression, echo, background noise)
- Real-time processing with minimal latency

Optimized for speed while maintaining robustness.
"""

import numpy as np
from typing import Optional, Tuple
from dataclasses import dataclass
from collections import deque
import logging

logger = logging.getLogger("uvicorn")


@dataclass
class AudioQualityMetrics:
    """Metrics about audio quality for adaptive processing"""
    snr_estimate: float = 0.0
    packet_loss_ratio: float = 0.0
    codec_artifact_level: float = 0.0
    is_voip: bool = False
    quality_score: float = 1.0


class FastSpectralGate:
    """
    Ultra-fast spectral noise gate using simple FFT-based approach.
    Much faster than full spectral subtraction while still effective.
    """
    
    def __init__(self, sample_rate: int = 16000, frame_size: int = 512):
        self.sample_rate = sample_rate
        self.frame_size = frame_size
        self.noise_floor = None
        self.noise_frames_count = 0
        self.noise_estimation_frames = 10
        self.gate_threshold = 0.1
        
        # Pre-compute window for speed
        self.window = np.hanning(frame_size).astype(np.float32)
        
    def estimate_noise_floor(self, magnitude: np.ndarray):
        """Incrementally estimate noise floor from quiet frames"""
        if self.noise_floor is None:
            self.noise_floor = magnitude.copy()
        else:
            # Exponential moving average
            alpha = 0.1
            self.noise_floor = alpha * magnitude + (1 - alpha) * self.noise_floor
        self.noise_frames_count += 1
        
    def apply(self, audio: np.ndarray) -> np.ndarray:
        """Apply fast spectral gating"""
        if len(audio) < self.frame_size:
            return audio
            
        # Process in frames
        output = np.zeros_like(audio)
        hop_size = self.frame_size // 2
        
        for i in range(0, len(audio) - self.frame_size, hop_size):
            frame = audio[i:i + self.frame_size] * self.window
            
            # FFT
            spectrum = np.fft.rfft(frame)
            magnitude = np.abs(spectrum)
            phase = np.angle(spectrum)
            
            # Simple energy-based noise estimation for quiet frames
            frame_energy = np.mean(magnitude ** 2)
            if frame_energy < 0.01 or self.noise_frames_count < self.noise_estimation_frames:
                self.estimate_noise_floor(magnitude)
            
            # Apply gate if we have noise estimate
            if self.noise_floor is not None:
                # Soft gate - attenuate frequencies below threshold
                gain = np.maximum(0, 1 - (self.noise_floor / (magnitude + 1e-10)))
                gain = np.clip(gain, 0.1, 1.0)  # Don't completely zero out
                magnitude = magnitude * gain
            
            # Reconstruct
            spectrum = magnitude * np.exp(1j * phase)
            frame_out = np.fft.irfft(spectrum)
            
            # Overlap-add
            output[i:i + self.frame_size] += frame_out * self.window
            
        return output


class PacketLossConcealer:
    """
    Fast packet loss concealment using simple interpolation.
    Detects sudden drops/discontinuities and smooths them.
    """
    
    def __init__(self, threshold: float = 0.3):
        self.threshold = threshold
        self.last_valid_samples = None
        self.history_size = 160  # 10ms at 16kHz
        
    def detect_and_conceal(self, audio: np.ndarray) -> np.ndarray:
        """Detect packet loss artifacts and conceal them"""
        output = audio.copy()
        
        # Detect sudden amplitude drops (packet loss indicator)
        # Use sliding window energy
        window_size = 80  # 5ms
        
        for i in range(window_size, len(audio) - window_size):
            # Compare energy before and after
            energy_before = np.mean(audio[i-window_size:i] ** 2)
            energy_current = np.mean(audio[i:i+window_size] ** 2)
            
            # Sudden drop detection
            if energy_before > 0.001:  # Avoid division issues
                ratio = energy_current / (energy_before + 1e-10)
                
                if ratio < self.threshold:  # Sudden drop
                    # Linear interpolation to fill gap
                    gap_end = min(i + window_size * 2, len(audio))
                    
                    # Find where signal recovers
                    for j in range(i, gap_end):
                        energy_j = np.mean(audio[j:j+window_size] ** 2) if j + window_size <= len(audio) else 0
                        if energy_j > energy_before * 0.5:
                            gap_end = j
                            break
                    
                    # Interpolate
                    if gap_end > i:
                        interp = np.linspace(audio[i-1], audio[min(gap_end, len(audio)-1)], gap_end - i)
                        output[i:gap_end] = interp * 0.5 + output[i:gap_end] * 0.5
        
        return output


class CodecArtifactReducer:
    """
    Reduces codec artifacts common in VoIP (especially low bitrate codecs).
    Uses simple spectral smoothing optimized for speed.
    """
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        # Codec artifact frequencies (common in low-bitrate codecs)
        # Pre-compute filter for speed
        self.smoothing_window = 3
        
    def reduce_artifacts(self, audio: np.ndarray) -> np.ndarray:
        """Apply fast codec artifact reduction"""
        if len(audio) < 512:
            return audio
            
        # Simple approach: light low-pass to reduce codec ringing
        # Using convolution which is fast
        kernel_size = 3
        kernel = np.array([0.25, 0.5, 0.25], dtype=np.float32)
        
        # Only apply to high-frequency content to preserve speech
        # Split into bands using simple FFT
        spectrum = np.fft.rfft(audio)
        magnitude = np.abs(spectrum)
        phase = np.angle(spectrum)
        
        # Smooth high frequencies only (above 4kHz)
        nyquist = self.sample_rate // 2
        cutoff_bin = int(4000 / nyquist * len(magnitude))
        
        # Apply smoothing to high frequencies
        magnitude[cutoff_bin:] = np.convolve(magnitude[cutoff_bin:], kernel, mode='same')
        
        # Reconstruct
        spectrum = magnitude * np.exp(1j * phase)
        return np.fft.irfft(spectrum, n=len(audio))


class VoIPNoiseReducer:
    """
    Specialized noise reduction for VoIP characteristics:
    - Compression artifacts
    - Echo residuals
    - Background office/ambient noise
    - GSM/Opus codec specific issues
    """
    
    def __init__(self, sample_rate: int = 16000, aggressiveness: float = 0.5):
        self.sample_rate = sample_rate
        self.aggressiveness = aggressiveness
        
        # Voice activity detection threshold
        self.vad_threshold = 0.01
        
        # Noise profile (adaptive)
        self.noise_profile = None
        self.noise_update_rate = 0.05
        
        # Frame parameters
        self.frame_size = 512
        self.hop_size = 256
        self.window = np.sqrt(np.hanning(self.frame_size)).astype(np.float32)
        
    def _estimate_noise(self, magnitude: np.ndarray, is_speech: bool):
        """Update noise estimate during non-speech"""
        if self.noise_profile is None:
            self.noise_profile = magnitude.copy()
        elif not is_speech:
            # Update noise profile during silence
            self.noise_profile = (
                (1 - self.noise_update_rate) * self.noise_profile + 
                self.noise_update_rate * magnitude
            )
            
    def _spectral_subtraction(self, magnitude: np.ndarray, phase: np.ndarray) -> np.ndarray:
        """Fast spectral subtraction"""
        if self.noise_profile is None:
            return magnitude * np.exp(1j * phase)
            
        # Subtract noise with over-subtraction factor
        over_subtraction = 1.0 + self.aggressiveness
        
        # Wiener-like gain
        gain = np.maximum(
            0,
            1 - over_subtraction * (self.noise_profile / (magnitude + 1e-10))
        )
        
        # Apply gain floor to prevent musical noise
        gain = np.maximum(gain, 0.1)
        
        return gain * magnitude * np.exp(1j * phase)
        
    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply VoIP-optimized noise reduction"""
        if len(audio) < self.frame_size:
            return audio
            
        output = np.zeros(len(audio) + self.frame_size, dtype=np.float32)
        
        num_frames = (len(audio) - self.frame_size) // self.hop_size + 1
        
        for i in range(num_frames):
            start = i * self.hop_size
            frame = audio[start:start + self.frame_size].astype(np.float32)
            
            if len(frame) < self.frame_size:
                frame = np.pad(frame, (0, self.frame_size - len(frame)))
                
            # Apply window
            windowed = frame * self.window
            
            # FFT
            spectrum = np.fft.rfft(windowed)
            magnitude = np.abs(spectrum)
            phase = np.angle(spectrum)
            
            # Simple VAD based on energy
            energy = np.sum(magnitude ** 2)
            is_speech = energy > self.vad_threshold * self.frame_size
            
            # Update noise estimate
            self._estimate_noise(magnitude, is_speech)
            
            # Apply spectral subtraction
            spectrum_clean = self._spectral_subtraction(magnitude, phase)
            
            # IFFT
            frame_clean = np.fft.irfft(spectrum_clean, n=self.frame_size)
            
            # Apply window and overlap-add
            output[start:start + self.frame_size] += frame_clean * self.window
            
        return output[:len(audio)]


class AdaptiveGainController:
    """
    Fast adaptive gain control to normalize levels.
    Handles varying volume levels common in VoIP.
    """
    
    def __init__(self, target_level: float = 0.3, attack_time: float = 0.01, 
                 release_time: float = 0.1, sample_rate: int = 16000):
        self.target_level = target_level
        self.sample_rate = sample_rate
        
        # Time constants
        self.attack_coef = 1 - np.exp(-1 / (attack_time * sample_rate))
        self.release_coef = 1 - np.exp(-1 / (release_time * sample_rate))
        
        self.current_gain = 1.0
        self.envelope = 0.0
        
    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply adaptive gain control"""
        output = np.zeros_like(audio)
        
        for i in range(len(audio)):
            # Track envelope
            abs_sample = abs(audio[i])
            
            if abs_sample > self.envelope:
                self.envelope += self.attack_coef * (abs_sample - self.envelope)
            else:
                self.envelope += self.release_coef * (abs_sample - self.envelope)
            
            # Calculate desired gain
            if self.envelope > 0.001:
                desired_gain = self.target_level / self.envelope
                desired_gain = np.clip(desired_gain, 0.1, 10.0)
            else:
                desired_gain = 1.0
                
            # Smooth gain changes
            self.current_gain += 0.001 * (desired_gain - self.current_gain)
            
            output[i] = audio[i] * self.current_gain
            
        return np.clip(output, -1.0, 1.0)


class JitterBufferSimulator:
    """
    Simulates the effect of jitter buffers to make model robust to timing variations.
    Also smooths out timing irregularities in incoming audio.
    """
    
    def __init__(self, buffer_ms: int = 20, sample_rate: int = 16000):
        self.buffer_size = int(buffer_ms * sample_rate / 1000)
        self.sample_rate = sample_rate
        self.buffer = deque(maxlen=self.buffer_size * 3)
        
    def process(self, audio: np.ndarray) -> np.ndarray:
        """Smooth out jitter effects"""
        # Add to buffer
        for sample in audio:
            self.buffer.append(sample)
            
        # Return smoothed output
        if len(self.buffer) >= self.buffer_size:
            output = np.array(list(self.buffer)[:len(audio)], dtype=np.float32)
            # Remove output samples from buffer
            for _ in range(min(len(audio), len(self.buffer))):
                if self.buffer:
                    self.buffer.popleft()
            return output
        else:
            return audio


class RobustAudioPreprocessor:
    """
    Main preprocessor combining all robust processing techniques.
    Optimized for real-time performance.
    """
    
    def __init__(self, sample_rate: int = 16000, 
                 enable_noise_reduction: bool = True,
                 enable_packet_loss_concealment: bool = True,
                 enable_codec_artifact_reduction: bool = True,
                 enable_gain_control: bool = True,
                 voip_mode: bool = True,
                 aggressiveness: float = 0.3):
        
        self.sample_rate = sample_rate
        self.voip_mode = voip_mode
        
        # Initialize components based on settings
        self.noise_reducer = None
        self.packet_concealer = None
        self.codec_reducer = None
        self.gain_controller = None
        self.spectral_gate = None
        
        if enable_noise_reduction:
            if voip_mode:
                self.noise_reducer = VoIPNoiseReducer(sample_rate, aggressiveness)
            else:
                self.spectral_gate = FastSpectralGate(sample_rate)
                
        if enable_packet_loss_concealment:
            self.packet_concealer = PacketLossConcealer()
            
        if enable_codec_artifact_reduction:
            self.codec_reducer = CodecArtifactReducer(sample_rate)
            
        if enable_gain_control:
            self.gain_controller = AdaptiveGainController(sample_rate=sample_rate)
            
        # Quality metrics
        self.metrics = AudioQualityMetrics()
        
        # Processing statistics
        self.frames_processed = 0
        self.total_processing_time = 0.0
        
    def _detect_quality_issues(self, audio: np.ndarray) -> AudioQualityMetrics:
        """Fast quality assessment"""
        metrics = AudioQualityMetrics()
        
        # Estimate SNR (simplified)
        signal_power = np.mean(audio ** 2)
        
        # Estimate noise from quiet parts (simple heuristic)
        sorted_power = np.sort(audio ** 2)
        noise_power = np.mean(sorted_power[:len(sorted_power)//10]) + 1e-10
        
        metrics.snr_estimate = 10 * np.log10(signal_power / noise_power + 1e-10)
        
        # Detect potential packet loss (sudden drops)
        diff = np.abs(np.diff(audio))
        metrics.packet_loss_ratio = np.sum(diff > 0.5) / len(diff)
        
        # Detect codec artifacts (unnatural spectral patterns)
        if len(audio) >= 512:
            spectrum = np.abs(np.fft.rfft(audio[:512]))
            # High frequency rolloff indicator of codec
            hf_energy = np.mean(spectrum[len(spectrum)//2:])
            lf_energy = np.mean(spectrum[:len(spectrum)//2]) + 1e-10
            metrics.codec_artifact_level = float(1 - min(1, hf_energy / lf_energy))
            
        # VoIP detection heuristic
        metrics.is_voip = bool(
            metrics.codec_artifact_level > 0.3 or 
            metrics.packet_loss_ratio > 0.01 or
            metrics.snr_estimate < 20
        )
        
        # Overall quality score
        metrics.quality_score = max(0, min(1, 
            0.4 * (metrics.snr_estimate / 40) +
            0.3 * (1 - metrics.packet_loss_ratio) +
            0.3 * (1 - metrics.codec_artifact_level)
        ))
        
        return metrics
        
    def process(self, audio: np.ndarray, detect_quality: bool = False) -> Tuple[np.ndarray, Optional[AudioQualityMetrics]]:
        """
        Process audio with robust preprocessing.
        
        Args:
            audio: Input audio (float32, normalized to [-1, 1])
            detect_quality: Whether to compute quality metrics
            
        Returns:
            Tuple of (processed_audio, quality_metrics or None)
        """
        import time
        start_time = time.time()
        
        # Convert to float32 if needed
        if audio.dtype != np.float32:
            if audio.dtype == np.int16:
                audio = audio.astype(np.float32) / 32768.0
            else:
                audio = audio.astype(np.float32)
        
        # Quality detection (optional, adds ~0.5ms)
        metrics = None
        if detect_quality:
            metrics = self._detect_quality_issues(audio)
            self.metrics = metrics
            
        # 1. Packet loss concealment (fast, ~0.1ms)
        if self.packet_concealer:
            audio = self.packet_concealer.detect_and_conceal(audio)
            
        # 2. Noise reduction (main processing, ~1-2ms)
        if self.noise_reducer:
            audio = self.noise_reducer.process(audio)
        elif self.spectral_gate:
            audio = self.spectral_gate.apply(audio)
            
        # 3. Codec artifact reduction (~0.3ms)
        if self.codec_reducer:
            audio = self.codec_reducer.reduce_artifacts(audio)
            
        # 4. Gain control (~0.2ms)
        if self.gain_controller:
            audio = self.gain_controller.process(audio)
            
        # 5. Final normalization
        audio = self._normalize(audio)
        
        # Update stats
        self.frames_processed += 1
        self.total_processing_time += time.time() - start_time
        
        return audio, metrics
        
    def _normalize(self, audio: np.ndarray) -> np.ndarray:
        """Fast normalization"""
        # DC offset removal
        audio = audio - np.mean(audio)
        
        # Peak normalization
        max_val = np.abs(audio).max()
        if max_val > 0.001:
            audio = audio * (0.95 / max_val)
            
        return audio.astype(np.float32)
        
    def get_stats(self) -> dict:
        """Get processing statistics"""
        avg_time = (self.total_processing_time / self.frames_processed * 1000 
                    if self.frames_processed > 0 else 0)
        return {
            "frames_processed": self.frames_processed,
            "avg_processing_time_ms": avg_time,
            "current_quality": self.metrics.quality_score if self.metrics else 1.0
        }


# Factory function for easy instantiation
def create_preprocessor(mode: str = "voip", aggressiveness: float = 0.3) -> RobustAudioPreprocessor:
    """
    Create a preprocessor optimized for specific use case.
    
    Args:
        mode: "voip" for VoIP calls, "clean" for high-quality audio, "aggressive" for noisy environments
        aggressiveness: Noise reduction strength (0.0 to 1.0)
        
    Returns:
        Configured RobustAudioPreprocessor
    """
    if mode == "voip":
        return RobustAudioPreprocessor(
            enable_noise_reduction=True,
            enable_packet_loss_concealment=True,
            enable_codec_artifact_reduction=True,
            enable_gain_control=True,
            voip_mode=True,
            aggressiveness=aggressiveness
        )
    elif mode == "clean":
        return RobustAudioPreprocessor(
            enable_noise_reduction=False,
            enable_packet_loss_concealment=False,
            enable_codec_artifact_reduction=False,
            enable_gain_control=True,
            voip_mode=False
        )
    elif mode == "aggressive":
        return RobustAudioPreprocessor(
            enable_noise_reduction=True,
            enable_packet_loss_concealment=True,
            enable_codec_artifact_reduction=True,
            enable_gain_control=True,
            voip_mode=True,
            aggressiveness=0.7
        )
    else:
        return RobustAudioPreprocessor()
