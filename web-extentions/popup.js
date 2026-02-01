// popup.js - Handles UI interactions and communicates with background script

let isStreaming = false;
let detectionResults = [];

// Load saved settings
chrome.storage.local.get(['backendUrl', 'audioSource'], (result) => {
  if (result.backendUrl) {
    document.getElementById('backendUrl').value = result.backendUrl;
  }
  if (result.audioSource) {
    document.getElementById('audioSource').value = result.audioSource;
  }
});

// Update status display
function updateStatus(status, message) {
  const statusEl = document.getElementById('status');
  statusEl.className = `status ${status}`;
  statusEl.textContent = message;
}

// Update detection panel
function updateDetectionPanel(show) {
  const panel = document.getElementById('detectionPanel');
  panel.style.display = show ? 'block' : 'none';
}

// Add detection result to UI
function addDetectionResult(data) {
  const resultsEl = document.getElementById('detectionResults');
  
  // Remove "no results" message if present
  const noResults = resultsEl.querySelector('.no-results');
  if (noResults) {
    noResults.remove();
  }
  
  // Create result element
  const resultEl = document.createElement('div');
  resultEl.className = `detection-result ${data.status}`;
  
  const time = new Date(data.timestamp).toLocaleTimeString();
  const confidence = (data.confidence * 100).toFixed(1);
  
  if (data.status === 'deepfake') {
    resultEl.innerHTML = `⚠️ <strong>DEEPFAKE</strong> detected at ${time} (${confidence}% confidence)`;
  } else {
    resultEl.innerHTML = `✅ Authentic audio at ${time} (${confidence}% confidence)`;
  }
  
  // Add to top of list
  resultsEl.insertBefore(resultEl, resultsEl.firstChild);
  
  // Keep only last 10 results
  while (resultsEl.children.length > 10) {
    resultsEl.removeChild(resultsEl.lastChild);
  }
}

// Check current streaming status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response && response.isStreaming) {
    isStreaming = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    updateStatus('connected', response.statusMessage || 'Connected');
    updateDetectionPanel(true);
  }
});

// Start streaming
document.getElementById('startBtn').addEventListener('click', async () => {
  const backendUrl = document.getElementById('backendUrl').value.trim();
  const audioSource = document.getElementById('audioSource').value;
  
  if (!backendUrl) {
    alert('Please enter a backend server URL');
    return;
  }
  
  // Save settings
  chrome.storage.local.set({ backendUrl, audioSource });
  
  updateStatus('connecting', 'Connecting...');
  
  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'START_STREAMING',
    backendUrl,
    audioSource
  }, (response) => {
    if (response && response.success) {
      isStreaming = true;
      document.getElementById('startBtn').style.display = 'none';
      document.getElementById('stopBtn').style.display = 'block';
      updateStatus('connected', 'Streaming active');
      updateDetectionPanel(true);
    } else {
      updateStatus('disconnected', response?.error || 'Failed to start streaming');
    }
  });
});

// Stop streaming
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_STREAMING' }, (response) => {
    isStreaming = false;
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    updateStatus('disconnected', 'Stopped');
    updateDetectionPanel(false);
    
    // Clear results
    document.getElementById('detectionResults').innerHTML = '<p class="no-results">No detections yet...</p>';
  });
});

// Listen for status updates and detection results from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATUS_UPDATE') {
    updateStatus(message.status, message.message);
  } else if (message.type === 'STREAMING_STOPPED') {
    isStreaming = false;
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    updateStatus('disconnected', message.message || 'Stopped');
    updateDetectionPanel(false);
  } else if (message.type === 'DETECTION_RESULT') {
    addDetectionResult(message.data);
  } else if (message.type === 'ALERT') {
    // Show alert in UI
    updateStatus('connected', '⚠️ Alert: ' + (message.data?.message || 'Suspicious audio'));
  }
});