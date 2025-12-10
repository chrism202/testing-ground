import { EventEmitter } from 'events';
import WebSocket from 'ws';

export class GeminiLiveClient extends EventEmitter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('Connected to Gemini Live API');

        // Send initial setup message
        const setupMessage = {
          setup: {
            model: `models/${this.model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede'  // Choose from available voices
                  }
                }
              }
            }
          }
        };

        this.ws.send(JSON.stringify(setupMessage));
        this.isConnected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleGeminiMessage(message);
        } catch (error) {
          console.error('Error parsing Gemini message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('Gemini WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from Gemini Live API');
        this.isConnected = false;
      });
    });
  }

  handleGeminiMessage(message) {
    // Handle setup complete
    if (message.setupComplete) {
      console.log('Gemini setup complete');
      return;
    }

    // Handle server content (responses)
    if (message.serverContent) {
      const content = message.serverContent;

      // Handle audio parts
      if (content.modelTurn) {
        content.modelTurn.parts?.forEach(part => {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
            // Emit audio data (base64 encoded)
            this.emit('audio', part.inlineData.data);
          }
          if (part.text) {
            this.emit('text', part.text);
          }
        });
      }

      // Handle turn complete
      if (content.turnComplete) {
        console.log('Turn complete');
      }
    }

    // Handle tool calls if needed
    if (message.toolCall) {
      console.log('Tool call received:', message.toolCall);
    }
  }

  async sendAudio(audioData) {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to Gemini');
    }

    // Send audio as base64 encoded PCM16 data
    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: audioData
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  async sendText(text) {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to Gemini');
    }

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}
