// background.js - Service worker that manages WebRTC connections

let peerConnection = null;
let audioStream = null;
let signalingWebSocket = null;
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
    
    // Connect to signaling server
    await connectSignalingServer(url);
    
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
        autoGainControl: true
      },
      video: false
    });
  } catch (error) {
    throw new Error('Failed to access microphone: ' + error.message);
  }
}

// Connect to WebSocket signaling server
function connectSignalingServer(url) {
  return new Promise((resolve, reject) => {
    signalingWebSocket = new WebSocket(url);
    
    signalingWebSocket.onopen = async () => {
      console.log('Signaling server connected');
      
      // Create peer connection and setup
      await setupPeerConnection();
      
      resolve();
    };
    
    signalingWebSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(new Error('Failed to connect to signaling server'));
    };
    
    signalingWebSocket.onclose = () => {
      console.log('Signaling server disconnected');
      if (isStreaming) {
        stopStreaming();
        showNotification('Connection Lost', 'Signaling server disconnected', 'error');
      }
    };
    
    signalingWebSocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleSignalingMessage(message);
      } catch (error) {
        console.error('Error handling signaling message:', error);
      }
    };
  });
}

// Setup WebRTC peer connection
async function setupPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);
  
  // Add audio tracks to peer connection
  audioStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, audioStream);
  });
  
  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignalingMessage({
        type: 'ice-candidate',
        candidate: event.candidate
      });
    }
  };
  
  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'connected') {
      updateStatus('connected', 'WebRTC connected');
      showNotification('Connected', 'WebRTC connection established');
    } else if (peerConnection.connectionState === 'failed') {
      updateStatus('disconnected', 'Connection failed');
      showNotification('Connection Failed', 'WebRTC connection failed', 'error');
      stopStreaming();
    } else if (peerConnection.connectionState === 'disconnected') {
      updateStatus('disconnected', 'Disconnected');
      stopStreaming();
    }
  };
  
  // Create and send offer
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false
  });
  
  await peerConnection.setLocalDescription(offer);
  
  sendSignalingMessage({
    type: 'offer',
    sdp: offer
  });
}

// Handle signaling messages from server
async function handleSignalingMessage(message) {
  if (!peerConnection) return;
  
  switch (message.type) {
    case 'answer':
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
      break;
      
    case 'ice-candidate':
      if (message.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
      break;
      
    case 'notification':
      // Handle custom notifications from backend
      showNotification(
        message.title || 'Notification',
        message.body || '',
        message.notificationType || 'info'
      );
      break;
      
    case 'command':
      // Handle commands from backend
      if (message.command === 'stop') {
        stopStreaming();
        showNotification('Stopped by Server', 'Streaming stopped by backend');
      }
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

// Send message through signaling server
function sendSignalingMessage(message) {
  if (signalingWebSocket && signalingWebSocket.readyState === WebSocket.OPEN) {
    signalingWebSocket.send(JSON.stringify(message));
  }
}

// Stop streaming
function stopStreaming() {
  isStreaming = false;
  statusMessage = 'Disconnected';
  
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
  
  // Close WebSocket
  if (signalingWebSocket) {
    signalingWebSocket.close();
    signalingWebSocket = null;
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
  const iconMap = {
    info: 'icons/icon48.png',
    error: 'icons/icon48.png',
    success: 'icons/icon48.png'
  };
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconMap[type],
    title: title,
    message: message,
    priority: 2
  });
}

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  stopStreaming();
});