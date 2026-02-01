// background.js - Service worker that manages WebRTC connections for deepfake detection

let peerConnection = null;
let dataChannel = null;
let audioStream = null;
let isStreaming = false;
let statusMessage = 'Disconnected';
let backendUrl = '';

// Configuration for WebRTC
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_STREAMING') {
    startStreaming(message.backendUrl, message.audioSource)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (message.type === 'STOP_STREAMING') {
    stopStreaming();
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATUS') {
    sendResponse({ isStreaming, statusMessage });
  }
});

// Start streaming audio
async function startStreaming(url, audioSource) {
  try {
    backendUrl = url;
    
    // Capture audio based on source selection
    if (audioSource === 'tab') {
      await captureTabAudio();
    } else {
      await captureMicrophoneAudio();
    }
    
    // Setup WebRTC and connect via HTTP offer/answer
    await setupPeerConnectionAndConnect(url);
    
    isStreaming = true;
    statusMessage = 'Connected';
    updateStatus('connected', 'Streaming active');
    
    // Show success notification
    showNotification('Streaming Started', 'Audio streaming is now active');
    
  } catch (error) {
    console.error('Error starting stream:', error);
    stopStreaming();
    updateStatus('disconnected', `Error: ${error.message}`);
    showNotification('Connection Failed', error.message, 'error');
    throw error;
  }
}

// Capture tab audio
async function captureTabAudio() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tabs.length === 0) {
    throw new Error('No active tab found');
  }
  
  audioStream = await chrome.tabCapture.capture({
    audio: true,
    video: false
  });
  
  if (!audioStream) {
    throw new Error('Failed to capture tab audio');
  }
}

// Capture microphone audio
async function captureMicrophoneAudio() {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000 // Match backend expected sample rate
      },
      video: false
    });
  } catch (error) {
    throw new Error('Failed to access microphone: ' + error.message);
  }
}

// Setup WebRTC and connect via HTTP offer/answer exchange
async function setupPeerConnectionAndConnect(url) {
  peerConnection = new RTCPeerConnection(rtcConfig);
  
  // Create data channel for receiving detection results from backend
  dataChannel = peerConnection.createDataChannel('detection', {
    ordered: true
  });
  
  dataChannel.onopen = () => {
    console.log('Data channel opened - ready to receive detection results');
    updateStatus('connected', 'Data channel ready');
  };
  
  dataChannel.onclose = () => {
    console.log('Data channel closed');
  };
  
  dataChannel.onerror = (error) => {
    console.error('Data channel error:', error);
  };
  
  dataChannel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleDetectionResult(message);
    } catch (error) {
      console.error('Error parsing detection result:', error);
    }
  };
  
  // Add audio tracks to peer connection
  audioStream.getTracks().forEach(track => {
    console.log('Adding audio track:', track.label);
    peerConnection.addTrack(track, audioStream);
  });
  
  // Handle ICE candidates (for debugging)
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE candidate gathered:', event.candidate.type);
    }
  };
  
  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    
    switch (peerConnection.connectionState) {
      case 'connected':
        updateStatus('connected', 'WebRTC connected - Analyzing audio...');
        showNotification('Connected', 'Deepfake detection is now active');
        break;
      case 'failed':
        updateStatus('disconnected', 'Connection failed');
        showNotification('Connection Failed', 'WebRTC connection failed', 'error');
        stopStreaming();
        break;
      case 'disconnected':
        updateStatus('disconnected', 'Disconnected');
        stopStreaming();
        break;
    }
  };
  
  // Create offer
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false
  });
  
  await peerConnection.setLocalDescription(offer);
  
  // Wait for ICE gathering to complete (important for NAT traversal)
  await waitForIceGathering();
  
  console.log('Sending offer to backend:', url);
  
  // Send offer to backend via HTTP POST
  const response = await fetch(`${url}/api/v1/webrtc/offer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sdp: peerConnection.localDescription.sdp,
      type: peerConnection.localDescription.type
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error (${response.status}): ${errorText}`);
  }
  
  const answer = await response.json();
  console.log('Received answer from backend');
  
  // Set remote description (the answer from backend)
  await peerConnection.setRemoteDescription(new RTCSessionDescription({
    sdp: answer.sdp,
    type: answer.type
  }));
  
  console.log('WebRTC connection established with backend');
}

// Wait for ICE gathering to complete
function waitForIceGathering() {
  return new Promise((resolve) => {
    if (peerConnection.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    
    const checkState = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        peerConnection.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    
    peerConnection.addEventListener('icegatheringstatechange', checkState);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      peerConnection.removeEventListener('icegatheringstatechange', checkState);
      console.log('ICE gathering timeout, proceeding anyway');
      resolve();
    }, 5000);
  });
}

// Handle detection results from backend
function handleDetectionResult(message) {
  console.log('Detection result received:', message);
  
  if (message.type === 'detection_result') {
    const data = message.data;
    
    // Show notification for deepfake detection
    if (data.status === 'deepfake') {
      showNotification(
        '⚠️ Deepfake Detected!',
        `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
        'error'
      );
    }
    
    // Send to popup if open
    chrome.runtime.sendMessage({
      type: 'DETECTION_RESULT',
      data: data
    }).catch(() => {}); // Ignore if popup is closed
    
  } else if (message.type === 'alert') {
    showNotification(
      '🚨 Alert',
      message.data?.message || 'Suspicious audio detected',
      'error'
    );
    
    // Send alert to popup
    chrome.runtime.sendMessage({
      type: 'ALERT',
      data: message.data
    }).catch(() => {});
  }
}

// Stop streaming
function stopStreaming() {
  isStreaming = false;
  statusMessage = 'Disconnected';
  
  // Close data channel
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  
  // Close peer connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  // Stop audio stream
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  
  updateStatus('disconnected', 'Stopped');
  
  // Notify popup
  chrome.runtime.sendMessage({
    type: 'STREAMING_STOPPED',
    message: 'Streaming stopped'
  }).catch(() => {}); // Ignore errors if popup is closed
}

// Update status and notify popup
function updateStatus(status, message) {
  statusMessage = message;
  
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    status: status,
    message: message
  }).catch(() => {}); // Ignore errors if popup is closed
}

// Show Chrome notification
function showNotification(title, message, type = 'info') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message,
    priority: type === 'error' ? 2 : 1
  });
}

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  stopStreaming();
});
