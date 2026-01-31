// popup.js - Handles UI interactions and communicates with background script

let isStreaming = false;

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

// Check current streaming status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response && response.isStreaming) {
    isStreaming = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    updateStatus('connected', response.statusMessage || 'Connected');
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
  });
});

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATUS_UPDATE') {
    updateStatus(message.status, message.message);
  } else if (message.type === 'STREAMING_STOPPED') {
    isStreaming = false;
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    updateStatus('disconnected', message.message || 'Stopped');
  }
});