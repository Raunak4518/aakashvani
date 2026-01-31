"""
Real-Time Deepfake Voice Authentication Bypass Detection System
================================================================

Multi-model ensemble approach combining:
1. Spectral anomaly detection
2. Phase coherence analysis
3. Neural vocoder artifact detection
4. Temporal consistency verification
5. Biometric signature validation
"""

import numpy as np
import librosa
import scipy.signal as signal
from scipy import stats
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

class SpectralAnomalyDetector:
    """Detects anomalies in spectral characteristics typical of deepfakes"""
    
    def __init__(self):
        self.n_fft = 2048
        self.hop_length = 512
        self.n_mels = 128
        
    def extract_features(self, audio: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract spectral features for anomaly detection"""
        
        # Mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=audio, sr=sr, n_fft=self.n_fft, 
            hop_length=self.hop_length, n_mels=self.n_mels
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # MFCC for voice characteristics
        mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=20)
        
        # Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(
            y=audio, sr=sr, n_fft=self.n_fft, hop_length=self.hop_length
        )[0]
        
        spectral_rolloff = librosa.feature.spectral_rolloff(
            y=audio, sr=sr, n_fft=self.n_fft, hop_length=self.hop_length
        )[0]
        
        spectral_flux = librosa.onset.onset_strength(y=audio, sr=sr)
        
        # Zero crossing rate (useful for detecting synthesized artifacts)
        zcr = librosa.feature.zero_crossing_rate(audio, frame_length=2048, hop_length=512)[0]
        
        features = {
            'mel_spec_mean': np.mean(mel_spec_db),
            'mel_spec_std': np.std(mel_spec_db),
            'mel_spec_skewness': stats.skew(mel_spec_db.flatten()),
            'mel_spec_kurtosis': stats.kurtosis(mel_spec_db.flatten()),
            'mfcc_mean': np.mean(mfcc),
            'mfcc_std': np.std(mfcc),
            'mfcc_delta_mean': np.mean(np.diff(mfcc, axis=1)),
            'spectral_centroid_mean': np.mean(spectral_centroid),
            'spectral_centroid_std': np.std(spectral_centroid),
            'spectral_rolloff_mean': np.mean(spectral_rolloff),
            'spectral_rolloff_std': np.std(spectral_rolloff),
            'spectral_flux_mean': np.mean(spectral_flux),
            'spectral_flux_std': np.std(spectral_flux),
            'zcr_mean': np.mean(zcr),
            'zcr_std': np.std(zcr),
        }
        
        return features
    
    def detect_anomalies(self, features: Dict[str, float]) -> Tuple[float, Dict[str, float]]:
        """
        Detect spectral anomalies indicating deepfake
        Returns: (anomaly_score, individual_scores)
        """
        scores = {}
        
        # High kurtosis in mel spectrogram indicates unnatural peaks
        scores['mel_kurtosis'] = min(abs(features['mel_spec_kurtosis']) / 10.0, 1.0)
        
        # Unnatural spectral centroid stability (too consistent)
        scores['centroid_stability'] = 1.0 - min(features['spectral_centroid_std'] / 1000.0, 1.0)
        
        # Zero crossing rate anomalies
        if features['zcr_std'] < 0.01:  # Too stable
            scores['zcr_anomaly'] = 0.8
        else:
            scores['zcr_anomaly'] = 0.0
        
        # MFCC delta smoothness (deepfakes often too smooth)
        if abs(features['mfcc_delta_mean']) < 0.5:
            scores['mfcc_smoothness'] = 0.7
        else:
            scores['mfcc_smoothness'] = 0.0
        
        # Overall anomaly score
        anomaly_score = np.mean(list(scores.values()))
        
        return anomaly_score, scores


class PhaseCoherenceAnalyzer:
    """Analyzes phase coherence - deepfakes often have phase artifacts"""
    
    def __init__(self):
        self.n_fft = 2048
        self.hop_length = 512
        
    def analyze_phase(self, audio: np.ndarray, sr: int) -> Tuple[float, Dict[str, float]]:
        """Analyze phase coherence patterns"""
        
        # STFT for phase analysis
        stft = librosa.stft(audio, n_fft=self.n_fft, hop_length=self.hop_length)
        magnitude = np.abs(stft)
        phase = np.angle(stft)
        
        # Phase derivative (instantaneous frequency)
        phase_diff = np.diff(np.unwrap(phase, axis=1), axis=1)
        
        scores = {}
        
        # Phase coherence across frequency bins
        phase_coherence = np.mean(np.abs(np.diff(phase, axis=0)))
        scores['phase_coherence'] = min(phase_coherence / 3.0, 1.0)
        
        # Phase derivative variance (neural vocoders show abnormal patterns)
        phase_var = np.var(phase_diff)
        if phase_var < 0.5 or phase_var > 15.0:  # Too stable or too chaotic
            scores['phase_variance_anomaly'] = 0.8
        else:
            scores['phase_variance_anomaly'] = 0.0
        
        # Group delay analysis (phase derivative w.r.t. frequency)
        group_delay = -np.diff(phase, axis=0)
        group_delay_std = np.std(group_delay)
        
        if group_delay_std < 0.1:  # Unnatural consistency
            scores['group_delay_anomaly'] = 0.75
        else:
            scores['group_delay_anomaly'] = 0.0
        
        # Phase-magnitude correlation (should be complex in natural speech)
        phase_mag_corr = np.abs(np.corrcoef(magnitude.flatten()[:10000], 
                                             phase.flatten()[:10000])[0, 1])
        if phase_mag_corr > 0.3:  # Too correlated (artificial)
            scores['phase_mag_correlation'] = phase_mag_corr
        else:
            scores['phase_mag_correlation'] = 0.0
        
        overall_score = np.mean(list(scores.values()))
        
        return overall_score, scores


class NeuralVocoderArtifactDetector:
    """Detects artifacts specific to neural vocoders (WaveNet, WaveGlow, HiFi-GAN, etc.)"""
    
    def __init__(self):
        self.sample_rate = 16000
        
    def detect_artifacts(self, audio: np.ndarray, sr: int) -> Tuple[float, Dict[str, float]]:
        """Detect neural vocoder specific artifacts"""
        
        scores = {}
        
        # 1. High-frequency periodicity (common in neural vocoders)
        fft = np.fft.rfft(audio)
        freqs = np.fft.rfftfreq(len(audio), 1/sr)
        high_freq_mask = freqs > 4000
        high_freq_power = np.abs(fft[high_freq_mask])
        
        # Check for unnatural periodicity in high frequencies
        if len(high_freq_power) > 10:
            autocorr = np.correlate(high_freq_power, high_freq_power, mode='full')
            autocorr = autocorr[len(autocorr)//2:]
            autocorr = autocorr / autocorr[0]
            
            # Strong periodic patterns indicate synthesis
            if len(autocorr) > 50 and np.max(autocorr[10:50]) > 0.6:
                scores['high_freq_periodicity'] = np.max(autocorr[10:50])
            else:
                scores['high_freq_periodicity'] = 0.0
        else:
            scores['high_freq_periodicity'] = 0.0
        
        # 2. Temporal regularity in energy envelope
        envelope = np.abs(signal.hilbert(audio))
        envelope_smooth = signal.savgol_filter(envelope, window_length=51, polyorder=3)
        
        # Check for unnatural smoothness
        envelope_roughness = np.std(envelope - envelope_smooth)
        if envelope_roughness < 0.01:  # Too smooth
            scores['envelope_smoothness'] = 0.85
        else:
            scores['envelope_smoothness'] = 0.0
        
        # 3. Pitch contour artifacts
        try:
            pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
            pitch_contour = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_contour.append(pitch)
            
            if len(pitch_contour) > 10:
                pitch_contour = np.array(pitch_contour)
                pitch_std = np.std(np.diff(pitch_contour))
                
                # Unnatural pitch stability
                if pitch_std < 5.0:  # Too stable
                    scores['pitch_stability'] = 0.75
                else:
                    scores['pitch_stability'] = 0.0
            else:
                scores['pitch_stability'] = 0.0
        except:
            scores['pitch_stability'] = 0.0
        
        # 4. Formant artifacts
        # Neural vocoders sometimes produce unnatural formant transitions
        mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
        formant_changes = np.mean(np.abs(np.diff(mfcc[:5], axis=1)))
        
        if formant_changes < 1.0:  # Too smooth formant transitions
            scores['formant_smoothness'] = 0.7
        else:
            scores['formant_smoothness'] = 0.0
        
        # 5. Click/artifact detection in time domain
        audio_diff = np.abs(np.diff(audio))
        outlier_threshold = np.percentile(audio_diff, 99)
        num_outliers = np.sum(audio_diff > outlier_threshold * 2)
        
        if num_outliers < len(audio) * 0.0001:  # Too few transients (unnatural)
            scores['transient_deficit'] = 0.6
        else:
            scores['transient_deficit'] = 0.0
        
        overall_score = np.mean(list(scores.values()))
        
        return overall_score, scores


class TemporalConsistencyVerifier:
    """Verifies temporal consistency across audio segments"""
    
    def __init__(self, segment_duration: float = 1.0):
        self.segment_duration = segment_duration
        
    def verify_consistency(self, audio: np.ndarray, sr: int) -> Tuple[float, Dict[str, float]]:
        """Check for temporal inconsistencies across segments"""
        
        segment_samples = int(self.segment_duration * sr)
        num_segments = len(audio) // segment_samples
        
        if num_segments < 2:
            return 0.0, {'insufficient_segments': 1.0}
        
        scores = {}
        segment_features = []
        
        # Extract features from each segment
        for i in range(num_segments):
            start = i * segment_samples
            end = start + segment_samples
            segment = audio[start:end]
            
            # Basic features per segment
            rms = np.sqrt(np.mean(segment**2))
            zcr = np.mean(librosa.feature.zero_crossing_rate(segment))
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=segment, sr=sr))
            
            segment_features.append({
                'rms': rms,
                'zcr': zcr,
                'spectral_centroid': spectral_centroid
            })
        
        # Check consistency
        rms_values = [f['rms'] for f in segment_features]
        zcr_values = [f['zcr'] for f in segment_features]
        centroid_values = [f['spectral_centroid'] for f in segment_features]
        
        # Too little variation suggests synthesis
        rms_cv = np.std(rms_values) / (np.mean(rms_values) + 1e-10)
        if rms_cv < 0.1:  # Too consistent
            scores['rms_consistency'] = 0.7
        else:
            scores['rms_consistency'] = 0.0
        
        # Abrupt changes suggest concatenation or generation artifacts
        rms_jumps = np.abs(np.diff(rms_values))
        if np.max(rms_jumps) > 2 * np.mean(rms_jumps):
            scores['rms_jumps'] = 0.6
        else:
            scores['rms_jumps'] = 0.0
        
        # Spectral centroid consistency
        centroid_std = np.std(centroid_values)
        if centroid_std < 100:  # Too stable
            scores['centroid_consistency'] = 0.65
        else:
            scores['centroid_consistency'] = 0.0
        
        overall_score = np.mean(list(scores.values()))
        
        return overall_score, scores


class RealtimeDeepfakeDetector:
    """
    Main real-time deepfake detection system
    Ensemble of multiple detection methods
    """
    
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        """
        Initialize detector with component weights
        
        Args:
            weights: Dictionary of weights for each component
        """
        self.spectral_detector = SpectralAnomalyDetector()
        self.phase_analyzer = PhaseCoherenceAnalyzer()
        self.vocoder_detector = NeuralVocoderArtifactDetector()
        self.temporal_verifier = TemporalConsistencyVerifier()
        
        # Default weights (can be tuned)
        self.weights = weights or {
            'spectral': 0.25,
            'phase': 0.30,
            'vocoder': 0.30,
            'temporal': 0.15
        }
        
        # Thresholds
        self.deepfake_threshold = 0.5  # Overall score threshold
        self.high_confidence_threshold = 0.7
        
    def preprocess_audio(self, audio: np.ndarray, sr: int, 
                        target_sr: int = 16000) -> Tuple[np.ndarray, int]:
        """Preprocess audio for analysis"""
        
        # Resample if needed
        if sr != target_sr:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
            sr = target_sr
        
        # Normalize
        audio = audio / (np.max(np.abs(audio)) + 1e-10)
        
        # Remove DC offset
        audio = audio - np.mean(audio)
        
        # Apply pre-emphasis to boost high frequencies
        audio = librosa.effects.preemphasis(audio)
        
        return audio, sr
    
    def detect(self, audio: np.ndarray, sr: int, 
               return_details: bool = False) -> Dict:
        """
        Detect if audio is deepfake
        
        Args:
            audio: Audio signal
            sr: Sample rate
            return_details: Whether to return detailed component scores
            
        Returns:
            Dictionary with detection results
        """
        
        # Preprocess
        audio, sr = self.preprocess_audio(audio, sr)
        
        # Run all detectors
        spectral_score, spectral_details = self.spectral_detector.detect_anomalies(
            self.spectral_detector.extract_features(audio, sr)
        )
        
        phase_score, phase_details = self.phase_analyzer.analyze_phase(audio, sr)
        
        vocoder_score, vocoder_details = self.vocoder_detector.detect_artifacts(audio, sr)
        
        temporal_score, temporal_details = self.temporal_verifier.verify_consistency(audio, sr)
        
        # Weighted ensemble score
        overall_score = (
            self.weights['spectral'] * spectral_score +
            self.weights['phase'] * phase_score +
            self.weights['vocoder'] * vocoder_score +
            self.weights['temporal'] * temporal_score
        )
        
        # Make decision
        is_deepfake = overall_score >= self.deepfake_threshold
        confidence = 'high' if overall_score >= self.high_confidence_threshold or \
                              overall_score <= (1 - self.high_confidence_threshold) else 'medium'
        
        result = {
            'is_deepfake': is_deepfake,
            'confidence': confidence,
            'overall_score': overall_score,
            'component_scores': {
                'spectral': spectral_score,
                'phase': phase_score,
                'vocoder': vocoder_score,
                'temporal': temporal_score
            }
        }
        
        if return_details:
            result['detailed_scores'] = {
                'spectral': spectral_details,
                'phase': phase_details,
                'vocoder': vocoder_details,
                'temporal': temporal_details
            }
        
        return result
    
    def batch_detect(self, audio_segments: List[np.ndarray], sr: int) -> List[Dict]:
        """Process multiple audio segments"""
        return [self.detect(segment, sr) for segment in audio_segments]
    
    def adaptive_threshold(self, baseline_genuine_scores: List[float], 
                          false_positive_rate: float = 0.05):
        """
        Adaptively set threshold based on genuine voice samples
        
        Args:
            baseline_genuine_scores: Scores from known genuine samples
            false_positive_rate: Desired false positive rate
        """
        # Set threshold at the percentile that gives desired FPR
        percentile = (1 - false_positive_rate) * 100
        self.deepfake_threshold = np.percentile(baseline_genuine_scores, percentile)
        print(f"Adaptive threshold set to: {self.deepfake_threshold:.3f}")


# Utility functions
def simulate_voip_degradation(audio: np.ndarray, sr: int, 
                             packet_loss: float = 0.02,
                             codec: str = 'g711') -> np.ndarray:
    """
    Simulate VoIP network conditions
    
    Args:
        audio: Original audio
        sr: Sample rate
        packet_loss: Packet loss rate (0-1)
        codec: Codec simulation ('g711', 'opus', 'clean')
    """
    degraded = audio.copy()
    
    # Simulate packet loss
    if packet_loss > 0:
        num_samples = len(audio)
        packet_size = int(0.02 * sr)  # 20ms packets
        num_packets = num_samples // packet_size
        
        for i in range(num_packets):
            if np.random.random() < packet_loss:
                start = i * packet_size
                end = min(start + packet_size, num_samples)
                # Simple packet loss concealment (zero padding)
                degraded[start:end] = 0
    
    # Simulate codec compression artifacts
    if codec == 'g711':
        # μ-law compression (8-bit)
        mu = 255
        degraded = np.sign(degraded) * np.log(1 + mu * np.abs(degraded)) / np.log(1 + mu)
        # Quantize to 8-bit
        degraded = np.round(degraded * 127) / 127
        # Inverse μ-law
        degraded = np.sign(degraded) * (np.power(1 + mu, np.abs(degraded)) - 1) / mu
    
    elif codec == 'opus':
        # Simplified Opus simulation - bandlimiting and light quantization
        # Bandlimit to 8kHz (Opus narrowband mode)
        from scipy.signal import butter, filtfilt
        nyq = sr / 2
        cutoff = 8000 / nyq
        if cutoff < 1.0:
            b, a = butter(5, cutoff, btype='low')
            degraded = filtfilt(b, a, degraded)
        
        # Light quantization
        degraded = np.round(degraded * 1000) / 1000
    
    # Add slight background noise
    noise = np.random.normal(0, 0.001, len(degraded))
    degraded = degraded + noise
    
    return degraded


if __name__ == "__main__":
    print("Real-Time Deepfake Voice Detection System")
    print("=" * 50)
    print("\nInitializing detector...")
    
    detector = RealtimeDeepfakeDetector()
    
    print("✓ Detector initialized successfully")
    print(f"  - Spectral Anomaly Detector")
    print(f"  - Phase Coherence Analyzer")
    print(f"  - Neural Vocoder Artifact Detector")
    print(f"  - Temporal Consistency Verifier")
    print(f"\nDefault weights: {detector.weights}")
    print(f"Detection threshold: {detector.deepfake_threshold}")
