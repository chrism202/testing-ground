class GeminiSpeechClient {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.audioWorkletNode = null;
    this.isRecording = false;
    this.isConnected = false;

    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.statusEl = document.getElementById('status');
    this.connectBtn = document.getElementById('connectBtn');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.recordingIndicator = document.getElementById('recordingIndicator');
    this.transcript = document.getElementById('transcript');
    this.visualizer = document.getElementById('visualizer');
    this.canvasContext = this.visualizer.getContext('2d');
  }

  setupEventListeners() {
    this.connectBtn.addEventListener('click', () => this.connect());
    this.startBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
  }

  updateStatus(status, message) {
    this.statusEl.className = `status ${status}`;
    this.statusEl.textContent = message;
  }

  addMessage(role, text) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const labelEl = document.createElement('div');
    labelEl.className = 'message-label';
    labelEl.textContent = role === 'user' ? 'You' : 'Gemini';

    const textEl = document.createElement('div');
    textEl.textContent = text;

    messageEl.appendChild(labelEl);
    messageEl.appendChild(textEl);

    // Remove placeholder if present
    if (this.transcript.children.length === 1 &&
        this.transcript.children[0].tagName === 'P') {
      this.transcript.innerHTML = '';
    }

    this.transcript.appendChild(messageEl);
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  async connect() {
    try {
      this.updateStatus('connecting', 'Connecting...');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.updateStatus('connected', 'Connected to Gemini');
        this.connectBtn.disabled = true;
        this.startBtn.disabled = false;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus('disconnected', 'Connection error');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateStatus('disconnected', 'Disconnected');
        this.connectBtn.disabled = false;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = true;
        this.stopRecording();
      };

    } catch (error) {
      console.error('Connection error:', error);
      this.updateStatus('disconnected', 'Failed to connect');
    }
  }

  async handleMessage(message) {
    switch (message.type) {
      case 'ready':
        console.log('Server ready:', message.message);
        break;

      case 'audio':
        await this.playAudio(message.data);
        break;

      case 'text':
        this.addMessage('assistant', message.data);
        break;

      case 'error':
        console.error('Server error:', message.message);
        this.updateStatus('disconnected', `Error: ${message.message}`);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  async playAudio(base64Audio) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000
        });
      }

      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        bytes.length / 2,
        24000
      );

      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer);

      for (let i = 0; i < channelData.length; i++) {
        // Read 16-bit PCM samples
        const sample = dataView.getInt16(i * 2, true);
        channelData[i] = sample / 32768.0; // Normalize to -1 to 1
      }

      // Play the audio
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();

    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  async startRecording() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        });
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create a script processor for capturing audio
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const base64 = this.arrayBufferToBase64(pcm16.buffer);

        // Send to server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'audio',
            data: base64
          }));
        }

        // Visualize
        this.visualizeAudio(inputData);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.audioWorkletNode = processor;
      this.isRecording = true;
      this.recordingIndicator.classList.add('active');
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please grant permission and try again.');
    }
  }

  stopRecording() {
    this.isRecording = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    this.recordingIndicator.classList.remove('active');
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;

    // Clear visualizer
    this.canvasContext.clearRect(0, 0, this.visualizer.width, this.visualizer.height);
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  visualizeAudio(dataArray) {
    const canvas = this.visualizer;
    const ctx = this.canvasContext;
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const sliceWidth = width / dataArray.length;
    let x = 0;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#667eea';
    ctx.beginPath();

    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] + 1) / 2; // Normalize from -1,1 to 0,1
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }
}

// Initialize the client when the page loads
const client = new GeminiSpeechClient();
