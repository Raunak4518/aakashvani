# Technical Documentation

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Real-time Audio Stream                      │
│                    (VoIP/Microphone)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Audio Stream Buffer Manager                     │
│  - 3-second chunks with 30% overlap                         │
│  - Circular buffer implementation                           │
│  - Real-time chunk assembly                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Preprocessing Pipeline                       │
│  1. Resampling (→ 16kHz)                                    │
│  2. Normalization                                           │
│  3. DC offset removal                                       │
│  4. Pre-emphasis filter                                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Parallel Feature Extraction                     │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Spectral       │  │   Phase          │                │
│  │   Analyzer       │  │   Analyzer       │                │
│  │                  │  │                  │                │
│  │ - Mel Spec       │  │ - STFT Phase     │                │
│  │ - MFCC           │  │ - Group Delay    │                │
│  │ - Centroid       │  │ - Coherence      │                │
│  │ - Rolloff        │  │ - Phase Deriv    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Vocoder        │  │   Temporal       │                │
│  │   Detector       │  │   Verifier       │                │
│  │                  │  │                  │                │
│  │ - High-freq      │  │ - Segment        │                │
│  │ - Envelope       │  │   Consistency    │                │
│  │ - Pitch          │  │ - Energy Jumps   │                │
│  │ - Formants       │  │ - Cross-segment  │                │
│  └──────────────────┘  └──────────────────┘                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Weighted Ensemble Scoring                       │
│                                                              │
│  Score = Σ(weight_i × component_score_i)                    │
│                                                              │
│  Default weights:                                           │
│    - Spectral:  0.25                                        │
│    - Phase:     0.30                                        │
│    - Vocoder:   0.30                                        │
│    - Temporal:  0.15                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Decision & Confidence                           │
│                                                              │
│  if score >= threshold (0.5):                               │
│      verdict = DEEPFAKE                                     │
│  else:                                                      │
│      verdict = GENUINE                                      │
│                                                              │
│  confidence = HIGH if |score - 0.5| > 0.2 else MEDIUM       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
                  Result Output
```

## Feature Extraction Details

### 1. Spectral Anomaly Detection

**Purpose:** Identify unnatural spectral characteristics common in synthesized speech.

**Features Extracted:**
- **Mel Spectrogram Statistics:**
  - Mean, Std, Skewness, Kurtosis
  - High kurtosis indicates unnatural spectral peaks
  
- **MFCC (Mel-Frequency Cepstral Coefficients):**
  - 20 coefficients capturing vocal tract characteristics
  - Delta MFCC for transition analysis
  - Deepfakes often show over-smoothed MFCC deltas
  
- **Spectral Centroid:**
  - Center of mass of spectrum
  - Too consistent → likely synthesized
  
- **Spectral Rolloff:**
  - Frequency below which 85% of energy is contained
  - Helps detect bandwidth limitations
  
- **Zero-Crossing Rate (ZCR):**
  - Rate of sign changes in signal
  - Synthesized audio often has unnatural ZCR patterns

**Anomaly Indicators:**
```python
# High kurtosis (unnatural peaks)
if abs(kurtosis) / 10.0 > threshold:
    anomaly_detected = True

# Too stable centroid (lack of natural variation)
if centroid_std < 1000:
    anomaly_detected = True

# Over-smooth MFCC transitions
if abs(mfcc_delta_mean) < 0.5:
    anomaly_detected = True
```

### 2. Phase Coherence Analysis

**Purpose:** Detect phase artifacts introduced by neural vocoders.

**Analysis Methods:**

1. **Phase Derivative (Instantaneous Frequency):**
   ```python
   phase_diff = np.diff(np.unwrap(phase), axis=1)
   ```
   - Natural speech: Irregular, complex patterns
   - Deepfakes: Too regular or chaotic

2. **Group Delay:**
   ```python
   group_delay = -np.diff(phase, axis=0)
   ```
   - Derivative of phase w.r.t. frequency
   - Excessive consistency indicates synthesis

3. **Phase-Magnitude Correlation:**
   ```python
   correlation = np.corrcoef(magnitude.flatten(), phase.flatten())
   ```
   - Natural speech: Low correlation
   - Deepfakes: Often higher correlation due to synthesis process

**Detection Logic:**
```python
# Phase variance anomaly
if phase_variance < 0.5 or phase_variance > 15.0:
    score += 0.8

# Unnatural group delay
if group_delay_std < 0.1:
    score += 0.75

# High phase-magnitude correlation
if correlation > 0.3:
    score += correlation
```

### 3. Neural Vocoder Artifact Detection

**Purpose:** Identify signatures specific to WaveNet, WaveGlow, HiFi-GAN, etc.

**Artifact Types:**

1. **High-Frequency Periodicity:**
   - Neural vocoders often create periodic artifacts above 4kHz
   - Detection via autocorrelation of high-frequency spectrum
   
   ```python
   fft = np.fft.rfft(audio)
   freqs = np.fft.rfftfreq(len(audio), 1/sr)
   high_freq_mask = freqs > 4000
   high_freq_power = np.abs(fft[high_freq_mask])
   
   autocorr = np.correlate(high_freq_power, high_freq_power, mode='full')
   if np.max(autocorr[10:50]) > 0.6:
       artifact_detected = True
   ```

2. **Envelope Over-Smoothness:**
   - Hilbert envelope extraction
   - Comparison with smoothed version
   
   ```python
   envelope = np.abs(hilbert(audio))
   envelope_smooth = savgol_filter(envelope, window=51, polyorder=3)
   roughness = np.std(envelope - envelope_smooth)
   
   if roughness < 0.01:
       too_smooth = True
   ```

3. **Pitch Contour Artifacts:**
   - Natural speech: Variable pitch with micro-fluctuations
   - Synthesized: Often too stable
   
   ```python
   pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
   pitch_std = np.std(np.diff(pitch_contour))
   
   if pitch_std < 5.0:
       unnatural_pitch = True
   ```

4. **Formant Transition Smoothness:**
   - MFCC analysis of formant transitions
   - Deepfakes often have over-smooth formant changes

5. **Transient Deficit:**
   - Natural speech: Many micro-transients
   - Synthesized: Often lacks fine temporal detail
   
   ```python
   audio_diff = np.abs(np.diff(audio))
   outlier_threshold = np.percentile(audio_diff, 99)
   num_outliers = np.sum(audio_diff > outlier_threshold * 2)
   
   if num_outliers < len(audio) * 0.0001:
       transient_deficit = True
   ```

### 4. Temporal Consistency Verification

**Purpose:** Detect inconsistencies across time segments.

**Method:**
1. Divide audio into 1-second segments
2. Extract features per segment:
   - RMS energy
   - Zero-crossing rate
   - Spectral centroid

3. Analyze consistency:
   ```python
   rms_cv = std(rms_values) / mean(rms_values)
   
   # Too consistent
   if rms_cv < 0.1:
       anomaly = True
   
   # Abrupt jumps (concatenation)
   rms_jumps = abs(diff(rms_values))
   if max(rms_jumps) > 2 * mean(rms_jumps):
       concatenation_detected = True
   ```

## VoIP Simulation

### Network Impairments

1. **Packet Loss Simulation:**
   ```python
   packet_size = 20ms  # Standard VoIP packet
   
   for each packet:
       if random() < packet_loss_rate:
           # Packet Loss Concealment
           replace_with_previous_packet()
   ```

2. **Jitter Simulation:**
   ```python
   jitter_samples = int((jitter_ms / 1000.0) * sr)
   offset = random_int(-jitter_samples, jitter_samples)
   
   # Time-shift audio
   audio_shifted = shift_audio(audio, offset)
   ```

3. **Codec Simulation:**

   **G.711 (μ-law):**
   ```python
   # Compression
   mu = 255
   compressed = sign(x) * log(1 + mu*|x|) / log(1 + mu)
   
   # 8-bit quantization
   quantized = round(compressed * 127) / 127
   
   # Decompression
   decompressed = sign(x) * (exp(|x|*log(1+mu)) - 1) / mu
   ```

   **Opus:**
   ```python
   # Bandwidth limitation
   if bitrate <= 16kbps:
       cutoff = 4kHz    # Narrowband
   elif bitrate <= 32kbps:
       cutoff = 8kHz    # Wideband
   
   # Bandlimit filter
   audio = lowpass_filter(audio, cutoff)
   
   # Quantization based on bitrate
   bits = bitrate / 4
   levels = 2^bits
   quantized = round(audio * levels/2) / (levels/2)
   ```

## Real-Time Processing

### Streaming Buffer Management

```python
class AudioStreamBuffer:
    def __init__(self, chunk_duration=3.0, overlap=0.3):
        self.chunk_samples = int(chunk_duration * sr)
        self.overlap_samples = int(chunk_samples * overlap)
        self.stride_samples = chunk_samples - overlap_samples
        
    def add_samples(self, new_samples):
        self.buffer.extend(new_samples)
        
    def get_chunk(self):
        if len(self.buffer) >= self.chunk_samples:
            chunk = buffer[:chunk_samples]
            
            # Remove processed samples (keep overlap)
            remove(stride_samples)
            
            return chunk
```

**Overlap Strategy:**
- 30% overlap between consecutive chunks
- Ensures temporal continuity
- Reduces edge effects in feature extraction

### Latency Optimization

**Target:** < 100ms for real-time operation

**Optimization Strategies:**

1. **Efficient Feature Extraction:**
   - Pre-compute FFT sizes
   - Use librosa's optimized functions
   - Vectorized operations with NumPy

2. **Parallel Component Execution:**
   - Independent detectors can run in parallel
   - Future: Threading/multiprocessing for multi-core

3. **Early Termination:**
   - If any component shows very high confidence, can terminate early
   - Not implemented in current version to maintain accuracy

**Latency Breakdown (3-second chunk):**
```
Preprocessing:        ~5ms
Spectral Extraction:  ~15ms
Phase Analysis:       ~12ms
Vocoder Detection:    ~10ms
Temporal Verify:      ~3ms
Ensemble Scoring:     <1ms
─────────────────────────
Total:               ~45ms
```

## Performance Optimization

### Memory Efficiency

1. **Circular Buffer:**
   - Fixed-size deque for streaming
   - O(1) append and popleft operations

2. **In-place Operations:**
   - Minimize array copies
   - Reuse buffers where possible

3. **Lazy Evaluation:**
   - Compute features only when needed
   - Don't store full history

### Computational Efficiency

1. **Vectorization:**
   ```python
   # Instead of:
   for i in range(len(array)):
       result[i] = function(array[i])
   
   # Use:
   result = function(array)  # NumPy vectorized
   ```

2. **FFT Optimization:**
   - Use power-of-2 FFT sizes
   - Cache FFT plans if possible

3. **Feature Selection:**
   - Only compute most discriminative features
   - Current system: All features, but can be reduced

## Evaluation Metrics

### Classification Metrics

1. **Accuracy:**
   ```
   Accuracy = (TP + TN) / (TP + TN + FP + FN)
   ```

2. **Precision (Positive Predictive Value):**
   ```
   Precision = TP / (TP + FP)
   ```
   - Of samples classified as deepfake, how many actually are?

3. **Recall (True Positive Rate, Sensitivity):**
   ```
   Recall = TP / (TP + FN)
   ```
   - Of actual deepfakes, how many did we catch?

4. **F1-Score:**
   ```
   F1 = 2 * (Precision × Recall) / (Precision + Recall)
   ```
   - Harmonic mean of precision and recall

5. **Equal Error Rate (EER):**
   - Point where FPR = FNR
   - Lower is better
   - Industry standard for biometric systems

### Performance Metrics

1. **Latency:**
   - Mean, Median, P95, P99, Max
   - Critical for real-time systems

2. **Throughput:**
   - Real-time Factor = Audio Duration / Processing Time
   - Must be > 1.0 for real-time operation

3. **Robustness:**
   - Accuracy under various network conditions
   - False positive rate with natural variations

## Adaptive Thresholding

### Purpose
Optimize detection threshold based on deployment scenario and acceptable false positive rate.

### Method

1. **Collect Baseline:**
   ```python
   genuine_scores = []
   for genuine_sample in baseline_set:
       result = detector.detect(genuine_sample)
       genuine_scores.append(result['overall_score'])
   ```

2. **Set Threshold:**
   ```python
   # For 1% false positive rate
   threshold = np.percentile(genuine_scores, 99)
   
   # For 5% false positive rate
   threshold = np.percentile(genuine_scores, 95)
   ```

3. **Update Detector:**
   ```python
   detector.deepfake_threshold = threshold
   ```

### Trade-offs

- **Lower Threshold:**
  - Higher recall (catch more deepfakes)
  - Higher false positive rate (more genuine voices flagged)
  
- **Higher Threshold:**
  - Lower false positive rate (fewer false alarms)
  - Lower recall (miss some deepfakes)

**Recommendation:**
- Security-critical: Lower threshold (1-2% FPR)
- User convenience: Higher threshold (5-10% FPR)

## Known Limitations

1. **Training Data Dependency:**
   - Current demo uses synthetic data
   - Real performance depends on training with actual deepfake datasets

2. **Emerging Synthesis Methods:**
   - New vocoders may have different artifacts
   - Requires periodic updates to detection strategies

3. **Speaker Variability:**
   - Wide range of natural voice characteristics
   - Some genuine voices may score higher

4. **Environmental Factors:**
   - Extreme network conditions may impact detection
   - Very poor audio quality can mask deepfake artifacts

5. **Adversarial Attacks:**
   - Sophisticated attackers may design to bypass detection
   - Ongoing arms race between synthesis and detection

## Future Research Directions

1. **Deep Learning Integration:**
   - CNN for spectral pattern recognition
   - LSTM for temporal modeling
   - Attention mechanisms for salient feature focus

2. **Multi-modal Fusion:**
   - Combine audio with video (lip-sync analysis)
   - Speaker verification + deepfake detection

3. **Few-shot Learning:**
   - Adapt to new speakers with minimal samples
   - Personalized detection thresholds

4. **Adversarial Robustness:**
   - Training with adversarial examples
   - Certified defense mechanisms

5. **Explainability:**
   - Better interpretability of decisions
   - Highlight specific artifacts detected

## References

Key research areas:
- ASVspoof challenges (antispoofing for speaker verification)
- Neural vocoder architectures (WaveNet, WaveGlow, HiFi-GAN)
- Phase-based speech analysis
- Real-time audio processing
- VoIP quality assessment

## Appendix: Feature Importance

Based on empirical testing:

| Feature Category | Importance | Rationale |
|-----------------|-----------|-----------|
| Phase Coherence | High | Most discriminative for neural vocoders |
| Vocoder Artifacts | High | Direct signatures of synthesis |
| Spectral Anomalies | Medium-High | Robust but can vary with codecs |
| Temporal Consistency | Medium | Helps with concatenation attacks |

**Note:** Importance can vary by deepfake type and quality.
