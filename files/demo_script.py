"""
Demo and Testing Script for Real-Time Deepfake Detection
========================================================

Includes:
- Synthetic audio generation for testing
- Complete demo pipeline
- Performance evaluation
- Visualization
"""

import numpy as np
import librosa
import soundfile as sf
import matplotlib.pyplot as plt
import os
from pathlib import Path

from realtime_deepfake_detector import RealtimeDeepfakeDetector
from voip_simulation import VoIPSimulator, CallSessionSimulator, RealtimeStreamProcessor
from evaluation_framework import EvaluationFramework, LatencyBenchmark


class SyntheticAudioGenerator:
    """Generate synthetic audio samples for testing"""
    
    def __init__(self, sample_rate: int = 16000):
        self.sr = sample_rate
        
    def generate_genuine_speech(self, duration: float = 5.0) -> np.ndarray:
        """
        Generate synthetic 'genuine' speech with natural characteristics
        
        This simulates natural speech patterns with:
        - Natural pitch variation
        - Formant structure
        - Voiced/unvoiced segments
        - Natural breathing pauses
        """
        
        num_samples = int(duration * self.sr)
        t = np.linspace(0, duration, num_samples)
        
        # Generate pitch contour (F0)
        f0_mean = 120  # Hz
        f0_variation = 30
        f0 = f0_mean + f0_variation * np.sin(2 * np.pi * 0.5 * t)
        f0 += np.random.randn(len(t)) * 5  # Add natural jitter
        
        # Generate speech signal
        speech = np.zeros(num_samples)
        
        # Create voiced segments with harmonics
        for i in range(num_samples):
            if np.random.rand() > 0.2:  # 80% voiced
                # Fundamental + harmonics
                phase = 2 * np.pi * f0[i] * t[i]
                speech[i] = np.sin(phase)
                speech[i] += 0.5 * np.sin(2 * phase)
                speech[i] += 0.25 * np.sin(3 * phase)
                speech[i] += 0.125 * np.sin(4 * phase)
            else:  # Unvoiced (fricatives, etc.)
                speech[i] = np.random.randn() * 0.5
        
        # Apply amplitude modulation (natural energy variation)
        envelope = np.abs(np.sin(2 * np.pi * 3 * t))
        envelope += 0.3 * np.random.rand(num_samples)
        speech *= envelope
        
        # Add formant structure using filters
        from scipy.signal import butter, filtfilt
        
        # Formant 1 (around 700 Hz)
        b1, a1 = butter(2, [600/self.sr*2, 800/self.sr*2], btype='band')
        f1 = filtfilt(b1, a1, speech)
        
        # Formant 2 (around 1200 Hz)
        b2, a2 = butter(2, [1000/self.sr*2, 1400/self.sr*2], btype='band')
        f2 = filtfilt(b2, a2, speech)
        
        # Formant 3 (around 2500 Hz)
        b3, a3 = butter(2, [2200/self.sr*2, 2800/self.sr*2], btype='band')
        f3 = filtfilt(b3, a3, speech)
        
        speech = speech + 0.8 * f1 + 0.6 * f2 + 0.4 * f3
        
        # Add breathing/pauses
        num_pauses = int(duration / 2)
        for _ in range(num_pauses):
            pause_start = np.random.randint(0, num_samples - int(0.2 * self.sr))
            pause_len = np.random.randint(int(0.05 * self.sr), int(0.15 * self.sr))
            speech[pause_start:pause_start+pause_len] *= 0.1
        
        # Add slight noise
        speech += np.random.randn(num_samples) * 0.01
        
        # Normalize
        speech = speech / (np.max(np.abs(speech)) + 1e-10) * 0.8
        
        return speech
    
    def generate_deepfake_speech(self, duration: float = 5.0, 
                                 artifact_type: str = 'vocoder') -> np.ndarray:
        """
        Generate synthetic 'deepfake' speech with typical artifacts
        
        Args:
            duration: Duration in seconds
            artifact_type: Type of deepfake artifacts to include
                          ('vocoder', 'phase', 'spectral', 'concatenation')
        """
        
        # Start with genuine-like speech
        speech = self.generate_genuine_speech(duration)
        
        if artifact_type == 'vocoder':
            # Neural vocoder artifacts: excessive smoothness, periodic artifacts
            # Over-smooth the signal
            from scipy.signal import savgol_filter
            speech = savgol_filter(speech, window_length=51, polyorder=3)
            
            # Add periodic high-frequency artifact
            num_samples = len(speech)
            t = np.linspace(0, duration, num_samples)
            artifact = 0.02 * np.sin(2 * np.pi * 8000 * t)
            speech += artifact
            
        elif artifact_type == 'phase':
            # Phase coherence artifacts
            from scipy.signal import hilbert
            analytic_signal = hilbert(speech)
            amplitude = np.abs(analytic_signal)
            
            # Create artificial phase with too much coherence
            artificial_phase = np.cumsum(np.ones(len(speech)) * 0.1)
            speech = amplitude * np.cos(artificial_phase)
            
        elif artifact_type == 'spectral':
            # Spectral artifacts: unnatural spectral envelope
            stft = librosa.stft(speech, n_fft=2048, hop_length=512)
            magnitude = np.abs(stft)
            phase = np.angle(stft)
            
            # Make spectral envelope too smooth
            from scipy.ndimage import gaussian_filter
            magnitude = gaussian_filter(magnitude, sigma=2.0)
            
            speech = librosa.istft(magnitude * np.exp(1j * phase), 
                                  hop_length=512, length=len(speech))
            
        elif artifact_type == 'concatenation':
            # Concatenation artifacts: abrupt transitions
            num_samples = len(speech)
            segment_length = num_samples // 5
            
            segments = []
            for i in range(5):
                segment = self.generate_genuine_speech(duration / 5)
                segments.append(segment)
            
            # Concatenate with abrupt transitions (no smoothing)
            speech = np.concatenate(segments)[:num_samples]
        
        # Normalize
        speech = speech / (np.max(np.abs(speech)) + 1e-10) * 0.8
        
        return speech
    
    def save_audio(self, audio: np.ndarray, filepath: str):
        """Save audio to file"""
        sf.write(filepath, audio, self.sr)


def run_complete_demo():
    """Run complete demonstration of the system"""
    
    print("=" * 70)
    print("REAL-TIME DEEPFAKE VOICE DETECTION - COMPLETE DEMO")
    print("=" * 70)
    print()
    
    # Create output directory
    output_dir = Path("/home/claude/demo_outputs")
    output_dir.mkdir(exist_ok=True)
    
    # 1. Generate synthetic test data
    print("1. Generating synthetic test audio...")
    print("-" * 70)
    
    generator = SyntheticAudioGenerator()
    
    genuine_files = []
    deepfake_files = []
    
    # Generate genuine samples
    for i in range(5):
        audio = generator.generate_genuine_speech(duration=5.0)
        filepath = output_dir / f"genuine_{i+1}.wav"
        generator.save_audio(audio, str(filepath))
        genuine_files.append(str(filepath))
    print(f"  ✓ Generated {len(genuine_files)} genuine samples")
    
    # Generate deepfake samples with different artifact types
    artifact_types = ['vocoder', 'phase', 'spectral', 'concatenation', 'vocoder']
    for i, artifact_type in enumerate(artifact_types):
        audio = generator.generate_deepfake_speech(duration=5.0, 
                                                   artifact_type=artifact_type)
        filepath = output_dir / f"deepfake_{artifact_type}_{i+1}.wav"
        generator.save_audio(audio, str(filepath))
        deepfake_files.append(str(filepath))
    print(f"  ✓ Generated {len(deepfake_files)} deepfake samples")
    
    # 2. Initialize detector
    print("\n2. Initializing Real-time Deepfake Detector...")
    print("-" * 70)
    detector = RealtimeDeepfakeDetector()
    print("  ✓ Detector initialized with ensemble of 4 components")
    
    # 3. Basic detection test
    print("\n3. Running Basic Detection Tests...")
    print("-" * 70)
    
    all_files = genuine_files + deepfake_files
    all_labels = [False] * len(genuine_files) + [True] * len(deepfake_files)
    
    for filepath, label in zip(all_files, all_labels):
        audio, sr = librosa.load(filepath, sr=16000, mono=True)
        result = detector.detect(audio, sr, return_details=False)
        
        true_label = "GENUINE" if not label else "DEEPFAKE"
        pred_label = "GENUINE" if not result['is_deepfake'] else "DEEPFAKE"
        status = "✓" if (result['is_deepfake'] == label) else "✗"
        
        print(f"  {status} {os.path.basename(filepath):30s} | "
              f"True: {true_label:8s} | Pred: {pred_label:8s} | "
              f"Score: {result['overall_score']:.3f}")
    
    # 4. VoIP simulation test
    print("\n4. Testing with VoIP Network Simulation...")
    print("-" * 70)
    
    voip_configs = {
        'Good Network': {
            'packet_loss_rate': 0.01,
            'jitter_ms': 10,
            'codec': 'opus',
            'bandwidth_kbps': 64
        },
        'Poor Network': {
            'packet_loss_rate': 0.05,
            'jitter_ms': 50,
            'codec': 'g711',
            'bandwidth_kbps': 24
        }
    }
    
    for network_name, config in voip_configs.items():
        print(f"\n  Testing '{network_name}' conditions:")
        print(f"    - Packet loss: {config['packet_loss_rate']*100}%")
        print(f"    - Jitter: {config['jitter_ms']}ms")
        print(f"    - Codec: {config['codec']}")
        
        voip_sim = VoIPSimulator(**config)
        
        correct = 0
        for filepath, label in zip(all_files[:3], all_labels[:3]):
            audio, sr = librosa.load(filepath, sr=16000, mono=True)
            degraded = voip_sim.simulate_network(audio, sr)
            
            result = detector.detect(degraded, sr)
            if result['is_deepfake'] == label:
                correct += 1
        
        accuracy = correct / 3
        print(f"    Accuracy: {accuracy*100:.1f}%")
    
    # 5. Latency benchmarking
    print("\n5. Benchmarking Processing Latency...")
    print("-" * 70)
    
    benchmark = LatencyBenchmark(detector)
    latency_results = benchmark.benchmark_latency(
        audio_durations=[3.0, 5.0, 10.0],
        num_iterations=50
    )
    
    print(latency_results.to_string(index=False))
    
    # Plot latency results
    benchmark.plot_latency_results(
        latency_results,
        save_path=str(output_dir / "latency_benchmark.png")
    )
    
    # 6. Full evaluation
    print("\n6. Running Comprehensive Evaluation...")
    print("-" * 70)
    
    evaluator = EvaluationFramework(detector)
    metrics = evaluator.evaluate_dataset(all_files, all_labels)
    
    print("\nEvaluation Results:")
    print(f"  Accuracy:  {metrics['accuracy']:.4f}")
    print(f"  Precision: {metrics['precision']:.4f}")
    print(f"  Recall:    {metrics['recall']:.4f}")
    print(f"  F1-Score:  {metrics['f1_score']:.4f}")
    print(f"  EER:       {metrics['eer']:.4f}")
    print(f"\n  Mean Processing Time: {metrics['mean_processing_time_ms']:.2f} ms")
    
    # Generate visualizations
    evaluator.plot_roc_curve(save_path=str(output_dir / "roc_curve.png"))
    evaluator.plot_confusion_matrix(save_path=str(output_dir / "confusion_matrix.png"))
    evaluator.plot_score_distribution(save_path=str(output_dir / "score_distribution.png"))
    
    # 7. Real-time streaming simulation
    print("\n7. Simulating Real-time VoIP Call Session...")
    print("-" * 70)
    
    stream_processor = RealtimeStreamProcessor(
        detector=detector,
        chunk_duration=3.0,
        voip_config={'packet_loss_rate': 0.02, 'codec': 'opus'}
    )
    
    print("\nProcessing first audio file in streaming mode...")
    chunk_count = 0
    for chunk, result, proc_time in stream_processor.stream_from_file(
        all_files[0], apply_voip=True
    ):
        chunk_count += 1
        status = "DEEPFAKE" if result['is_deepfake'] else "GENUINE"
        print(f"  Chunk {chunk_count}: {status} | Score: {result['overall_score']:.3f} | "
              f"Latency: {proc_time*1000:.1f}ms")
        
        if chunk_count >= 3:  # Process only first 3 chunks for demo
            break
    
    perf_stats = stream_processor.get_performance_stats()
    print(f"\nStreaming Performance:")
    print(f"  Mean Latency: {perf_stats['mean_latency_ms']:.2f} ms")
    print(f"  P95 Latency:  {perf_stats['p95_latency_ms']:.2f} ms")
    print(f"  Throughput:   {perf_stats['throughput_chunks_per_sec']:.2f} chunks/sec")
    
    # 8. Generate final report
    print("\n8. Generating Evaluation Report...")
    print("-" * 70)
    
    evaluator.generate_report(save_path=str(output_dir / "evaluation_report.txt"))
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)
    print(f"\nAll outputs saved to: {output_dir}")
    print("\nGenerated files:")
    print("  - Synthetic audio samples (genuine and deepfake)")
    print("  - ROC curve visualization")
    print("  - Confusion matrix")
    print("  - Score distribution plot")
    print("  - Latency benchmark plot")
    print("  - Comprehensive evaluation report")
    print("\n✓ Demo completed successfully!")
    
    return output_dir


def test_robustness():
    """Test robustness to various conditions"""
    
    print("\n" + "=" * 70)
    print("ROBUSTNESS TESTING")
    print("=" * 70)
    
    detector = RealtimeDeepfakeDetector()
    evaluator = EvaluationFramework(detector)
    generator = SyntheticAudioGenerator()
    
    output_dir = Path("/home/claude/demo_outputs")
    output_dir.mkdir(exist_ok=True)
    
    # Generate test samples
    genuine_files = []
    for i in range(3):
        audio = generator.generate_genuine_speech(duration=5.0)
        filepath = output_dir / f"test_genuine_{i}.wav"
        generator.save_audio(audio, str(filepath))
        genuine_files.append(str(filepath))
    
    deepfake_files = []
    for i in range(3):
        audio = generator.generate_deepfake_speech(duration=5.0, artifact_type='vocoder')
        filepath = output_dir / f"test_deepfake_{i}.wav"
        generator.save_audio(audio, str(filepath))
        deepfake_files.append(str(filepath))
    
    all_files = genuine_files + deepfake_files
    all_labels = [False] * len(genuine_files) + [True] * len(deepfake_files)
    
    # Test network robustness
    print("\n1. Network Robustness Test")
    print("-" * 70)
    
    network_conditions = [
        {
            'name': 'Clean',
            'params': {'packet_loss_rate': 0.0, 'codec': 'clean', 
                      'jitter_ms': 0, 'bandwidth_kbps': 128}
        },
        {
            'name': 'Good VoIP',
            'params': {'packet_loss_rate': 0.01, 'codec': 'opus', 
                      'jitter_ms': 10, 'bandwidth_kbps': 64}
        },
        {
            'name': 'Average VoIP',
            'params': {'packet_loss_rate': 0.03, 'codec': 'opus', 
                      'jitter_ms': 30, 'bandwidth_kbps': 32}
        },
        {
            'name': 'Poor VoIP',
            'params': {'packet_loss_rate': 0.05, 'codec': 'g711', 
                      'jitter_ms': 50, 'bandwidth_kbps': 24}
        }
    ]
    
    network_results = evaluator.test_robustness_to_network(
        all_files, all_labels, network_conditions
    )
    
    print(network_results.to_string(index=False))
    
    # Test natural variations
    print("\n2. Natural Variation Test (False Positive Rate)")
    print("-" * 70)
    
    variation_types = ['stress', 'illness', 'microphone_change', 
                      'background_noise', 'distance']
    
    variation_results = evaluator.test_natural_variations(
        genuine_files, variation_types
    )
    
    print(variation_results.to_string(index=False))
    
    print("\n✓ Robustness testing complete")


if __name__ == "__main__":
    # Run complete demo
    output_dir = run_complete_demo()
    
    # Run robustness tests
    test_robustness()
    
    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED SUCCESSFULLY")
    print("=" * 70)
