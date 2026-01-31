"""
Evaluation Framework for Real-Time Deepfake Detection
====================================================

Comprehensive testing including:
- Accuracy metrics
- Robustness to network conditions
- Natural variation handling (stress, illness)
- Latency and throughput benchmarking
- ROC/DET curve analysis
"""

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_curve, auc, confusion_matrix, classification_report
from typing import List, Dict, Tuple
import pandas as pd
import time
from scipy import signal as sp_signal
import librosa

class EvaluationFramework:
    """Comprehensive evaluation for deepfake detection"""
    
    def __init__(self, detector):
        self.detector = detector
        self.results = []
        
    def evaluate_dataset(self, audio_files: List[str], 
                        labels: List[bool],
                        sample_rate: int = 16000) -> Dict:
        """
        Evaluate detector on a dataset
        
        Args:
            audio_files: List of audio file paths
            labels: True labels (True=deepfake, False=genuine)
            sample_rate: Audio sample rate
            
        Returns:
            Evaluation metrics
        """
        
        predictions = []
        scores = []
        processing_times = []
        
        print("Evaluating detector on dataset...")
        print(f"Total samples: {len(audio_files)}")
        
        for i, (audio_file, true_label) in enumerate(zip(audio_files, labels)):
            try:
                # Load audio
                audio, sr = librosa.load(audio_file, sr=sample_rate, mono=True)
                
                # Detect
                start_time = time.time()
                result = self.detector.detect(audio, sr)
                proc_time = time.time() - start_time
                
                predictions.append(result['is_deepfake'])
                scores.append(result['overall_score'])
                processing_times.append(proc_time)
                
                if (i + 1) % 10 == 0:
                    print(f"  Processed {i+1}/{len(audio_files)} samples")
                
            except Exception as e:
                print(f"  Error processing {audio_file}: {e}")
                predictions.append(False)
                scores.append(0.0)
                processing_times.append(0.0)
        
        # Calculate metrics
        predictions = np.array(predictions)
        labels = np.array(labels)
        scores = np.array(scores)
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(labels, predictions).ravel()
        
        accuracy = (tp + tn) / len(labels)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
        
        # Equal Error Rate (EER)
        eer = self._calculate_eer(labels, scores)
        
        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'fpr': fpr,
            'fnr': fnr,
            'eer': eer,
            'true_positives': int(tp),
            'false_positives': int(fp),
            'true_negatives': int(tn),
            'false_negatives': int(fn),
            'mean_processing_time_ms': np.mean(processing_times) * 1000,
            'median_processing_time_ms': np.median(processing_times) * 1000,
            'p95_processing_time_ms': np.percentile(processing_times, 95) * 1000
        }
        
        self.results.append({
            'predictions': predictions,
            'labels': labels,
            'scores': scores,
            'processing_times': processing_times,
            'metrics': metrics
        })
        
        return metrics
    
    def _calculate_eer(self, labels: np.ndarray, scores: np.ndarray) -> float:
        """Calculate Equal Error Rate"""
        fpr, tpr, thresholds = roc_curve(labels, scores)
        fnr = 1 - tpr
        
        # Find where FPR and FNR are closest
        eer_idx = np.argmin(np.abs(fpr - fnr))
        eer = (fpr[eer_idx] + fnr[eer_idx]) / 2
        
        return eer
    
    def test_robustness_to_network(self, audio_files: List[str],
                                   labels: List[bool],
                                   network_conditions: List[Dict]) -> pd.DataFrame:
        """
        Test robustness to various network conditions
        
        Args:
            audio_files: Test audio files
            labels: True labels
            network_conditions: List of network condition dicts
        
        Returns:
            DataFrame with results across conditions
        """
        from voip_simulation import VoIPSimulator
        
        results = []
        
        for condition in network_conditions:
            print(f"\nTesting network condition: {condition['name']}")
            
            voip_sim = VoIPSimulator(**condition['params'])
            
            predictions = []
            scores = []
            
            for audio_file, true_label in zip(audio_files, labels):
                # Load and degrade
                audio, sr = librosa.load(audio_file, sr=16000, mono=True)
                degraded = voip_sim.simulate_network(audio, sr)
                
                # Detect
                result = self.detector.detect(degraded, sr)
                predictions.append(result['is_deepfake'])
                scores.append(result['overall_score'])
            
            # Metrics
            predictions = np.array(predictions)
            labels_np = np.array(labels)
            
            accuracy = np.mean(predictions == labels_np)
            eer = self._calculate_eer(labels_np, np.array(scores))
            
            results.append({
                'condition': condition['name'],
                'accuracy': accuracy,
                'eer': eer,
                **condition['params']
            })
        
        return pd.DataFrame(results)
    
    def test_natural_variations(self, 
                               genuine_samples: List[str],
                               variation_types: List[str]) -> pd.DataFrame:
        """
        Test false positive rate on natural voice variations
        
        Args:
            genuine_samples: Genuine voice samples
            variation_types: Types of variations to simulate
        
        Returns:
            DataFrame with false positive rates
        """
        
        results = []
        
        for var_type in variation_types:
            print(f"\nTesting natural variation: {var_type}")
            
            fps = 0
            total = 0
            
            for audio_file in genuine_samples:
                # Load audio
                audio, sr = librosa.load(audio_file, sr=16000, mono=True)
                
                # Apply variation
                varied_audio = self._apply_natural_variation(audio, sr, var_type)
                
                # Detect
                result = self.detector.detect(varied_audio, sr)
                
                if result['is_deepfake']:  # False positive
                    fps += 1
                total += 1
            
            fpr = fps / total if total > 0 else 0
            
            results.append({
                'variation_type': var_type,
                'false_positive_rate': fpr,
                'samples_tested': total
            })
        
        return pd.DataFrame(results)
    
    def _apply_natural_variation(self, audio: np.ndarray, sr: int, 
                                var_type: str) -> np.ndarray:
        """Apply natural voice variations"""
        
        if var_type == 'stress':
            # Simulate stressed voice: higher pitch, faster rate
            audio = librosa.effects.pitch_shift(audio, sr=sr, n_steps=2)
            audio = librosa.effects.time_stretch(audio, rate=1.1)
            
        elif var_type == 'illness':
            # Simulate congested/hoarse voice: lower formants, add breathiness
            # Add noise to simulate breathiness
            noise = np.random.normal(0, 0.01, len(audio))
            audio = audio + noise
            
            # Slight pitch shift down
            audio = librosa.effects.pitch_shift(audio, sr=sr, n_steps=-1)
            
        elif var_type == 'microphone_change':
            # Simulate different microphone quality
            # Bandlimit and add slight distortion
            from scipy.signal import butter, filtfilt
            nyq = sr / 2
            low = 300 / nyq
            high = 3400 / nyq  # Telephone quality
            b, a = butter(4, [low, high], btype='band')
            audio = filtfilt(b, a, audio)
            
        elif var_type == 'background_noise':
            # Add background noise
            noise = np.random.normal(0, 0.02, len(audio))
            audio = audio + noise
            
        elif var_type == 'distance':
            # Simulate speaking from distance (more reverb, less high freq)
            # Simple reverb
            reverb_time = 0.3
            ir_length = int(reverb_time * sr)
            ir = np.exp(-3 * np.arange(ir_length) / ir_length)
            audio = np.convolve(audio, ir, mode='same')
            
            # Reduce high frequencies
            from scipy.signal import butter, filtfilt
            nyq = sr / 2
            high = 5000 / nyq
            b, a = butter(4, high, btype='low')
            audio = filtfilt(b, a, audio)
        
        # Normalize
        audio = audio / (np.max(np.abs(audio)) + 1e-10)
        
        return audio
    
    def plot_roc_curve(self, save_path: Optional[str] = None):
        """Plot ROC curve"""
        if not self.results:
            print("No results to plot")
            return
        
        plt.figure(figsize=(10, 8))
        
        for i, result in enumerate(self.results):
            labels = result['labels']
            scores = result['scores']
            
            fpr, tpr, _ = roc_curve(labels, scores)
            roc_auc = auc(fpr, tpr)
            
            plt.plot(fpr, tpr, lw=2, 
                    label=f'ROC curve {i+1} (AUC = {roc_auc:.3f})')
        
        plt.plot([0, 1], [0, 1], 'k--', lw=2, label='Random')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate', fontsize=12)
        plt.ylabel('True Positive Rate', fontsize=12)
        plt.title('ROC Curve - Deepfake Detection', fontsize=14)
        plt.legend(loc="lower right")
        plt.grid(True, alpha=0.3)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"ROC curve saved to {save_path}")
        
        plt.close()
    
    def plot_confusion_matrix(self, save_path: Optional[str] = None):
        """Plot confusion matrix"""
        if not self.results:
            print("No results to plot")
            return
        
        result = self.results[-1]
        labels = result['labels']
        predictions = result['predictions']
        
        cm = confusion_matrix(labels, predictions)
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=['Genuine', 'Deepfake'],
                   yticklabels=['Genuine', 'Deepfake'])
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        plt.title('Confusion Matrix - Deepfake Detection', fontsize=14)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Confusion matrix saved to {save_path}")
        
        plt.close()
    
    def plot_score_distribution(self, save_path: Optional[str] = None):
        """Plot score distributions for genuine vs deepfake"""
        if not self.results:
            print("No results to plot")
            return
        
        result = self.results[-1]
        labels = result['labels']
        scores = result['scores']
        
        genuine_scores = scores[~labels]
        deepfake_scores = scores[labels]
        
        plt.figure(figsize=(10, 6))
        plt.hist(genuine_scores, bins=30, alpha=0.6, label='Genuine', color='green')
        plt.hist(deepfake_scores, bins=30, alpha=0.6, label='Deepfake', color='red')
        plt.axvline(x=self.detector.deepfake_threshold, color='black', 
                   linestyle='--', linewidth=2, label='Threshold')
        plt.xlabel('Detection Score', fontsize=12)
        plt.ylabel('Count', fontsize=12)
        plt.title('Score Distribution - Genuine vs Deepfake', fontsize=14)
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Score distribution saved to {save_path}")
        
        plt.close()
    
    def generate_report(self, save_path: str):
        """Generate comprehensive evaluation report"""
        if not self.results:
            print("No results to generate report")
            return
        
        report_lines = []
        report_lines.append("=" * 70)
        report_lines.append("DEEPFAKE VOICE DETECTION - EVALUATION REPORT")
        report_lines.append("=" * 70)
        report_lines.append("")
        
        for i, result in enumerate(self.results):
            metrics = result['metrics']
            
            report_lines.append(f"Evaluation {i+1}:")
            report_lines.append("-" * 70)
            report_lines.append("")
            report_lines.append("Classification Metrics:")
            report_lines.append(f"  Accuracy:     {metrics['accuracy']:.4f}")
            report_lines.append(f"  Precision:    {metrics['precision']:.4f}")
            report_lines.append(f"  Recall:       {metrics['recall']:.4f}")
            report_lines.append(f"  F1-Score:     {metrics['f1_score']:.4f}")
            report_lines.append(f"  FPR:          {metrics['fpr']:.4f}")
            report_lines.append(f"  FNR:          {metrics['fnr']:.4f}")
            report_lines.append(f"  EER:          {metrics['eer']:.4f}")
            report_lines.append("")
            report_lines.append("Confusion Matrix:")
            report_lines.append(f"  True Positives:   {metrics['true_positives']}")
            report_lines.append(f"  False Positives:  {metrics['false_positives']}")
            report_lines.append(f"  True Negatives:   {metrics['true_negatives']}")
            report_lines.append(f"  False Negatives:  {metrics['false_negatives']}")
            report_lines.append("")
            report_lines.append("Performance Metrics:")
            report_lines.append(f"  Mean Processing Time:   {metrics['mean_processing_time_ms']:.2f} ms")
            report_lines.append(f"  Median Processing Time: {metrics['median_processing_time_ms']:.2f} ms")
            report_lines.append(f"  P95 Processing Time:    {metrics['p95_processing_time_ms']:.2f} ms")
            report_lines.append("")
        
        report_lines.append("=" * 70)
        
        report_text = "\n".join(report_lines)
        
        with open(save_path, 'w') as f:
            f.write(report_text)
        
        print(f"Report saved to {save_path}")
        print(report_text)


class LatencyBenchmark:
    """Benchmark processing latency and throughput"""
    
    def __init__(self, detector):
        self.detector = detector
        
    def benchmark_latency(self, audio_durations: List[float],
                         num_iterations: int = 100) -> pd.DataFrame:
        """
        Benchmark latency for different audio durations
        
        Args:
            audio_durations: List of audio durations to test (seconds)
            num_iterations: Number of iterations per duration
        """
        
        results = []
        
        for duration in audio_durations:
            print(f"\nBenchmarking {duration}s audio chunks...")
            
            latencies = []
            
            for _ in range(num_iterations):
                # Generate random audio
                sr = 16000
                audio = np.random.randn(int(duration * sr))
                
                # Measure latency
                start_time = time.time()
                _ = self.detector.detect(audio, sr)
                latency = time.time() - start_time
                
                latencies.append(latency * 1000)  # Convert to ms
            
            results.append({
                'audio_duration_s': duration,
                'mean_latency_ms': np.mean(latencies),
                'median_latency_ms': np.median(latencies),
                'p95_latency_ms': np.percentile(latencies, 95),
                'p99_latency_ms': np.percentile(latencies, 99),
                'max_latency_ms': np.max(latencies),
                'throughput_realtime_factor': duration / (np.mean(latencies) / 1000)
            })
        
        return pd.DataFrame(results)
    
    def plot_latency_results(self, results: pd.DataFrame, 
                           save_path: Optional[str] = None):
        """Plot latency benchmark results"""
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        # Latency plot
        ax1.plot(results['audio_duration_s'], results['mean_latency_ms'], 
                'o-', label='Mean', linewidth=2)
        ax1.plot(results['audio_duration_s'], results['p95_latency_ms'], 
                's--', label='P95', linewidth=2)
        ax1.fill_between(results['audio_duration_s'],
                        results['mean_latency_ms'],
                        results['p95_latency_ms'],
                        alpha=0.2)
        ax1.set_xlabel('Audio Duration (s)', fontsize=12)
        ax1.set_ylabel('Latency (ms)', fontsize=12)
        ax1.set_title('Processing Latency vs Audio Duration', fontsize=14)
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Throughput plot
        ax2.plot(results['audio_duration_s'], 
                results['throughput_realtime_factor'], 
                'o-', linewidth=2, color='green')
        ax2.axhline(y=1.0, color='red', linestyle='--', 
                   linewidth=2, label='Real-time threshold')
        ax2.set_xlabel('Audio Duration (s)', fontsize=12)
        ax2.set_ylabel('Real-time Factor', fontsize=12)
        ax2.set_title('Throughput (Real-time Factor)', fontsize=14)
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Latency results saved to {save_path}")
        
        plt.close()


if __name__ == "__main__":
    print("Evaluation Framework for Deepfake Detection")
    print("=" * 50)
    print("\nComponents:")
    print("  ✓ Dataset evaluation")
    print("  ✓ Network robustness testing")
    print("  ✓ Natural variation testing")
    print("  ✓ Latency benchmarking")
    print("  ✓ Visualization tools")
    print("  ✓ Report generation")
