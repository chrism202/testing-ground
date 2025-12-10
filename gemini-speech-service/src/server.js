import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeminiLiveClient } from './gemini-client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handler
wss.on('connection', async (ws) => {
  console.log('Client connected');

  let geminiClient = null;

  try {
    // Initialize Gemini Live API client
    geminiClient = new GeminiLiveClient(GEMINI_API_KEY);

    // Handle messages from Gemini and forward to client
    geminiClient.on('audio', (audioData) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio',
          data: audioData
        }));
      }
    });

    geminiClient.on('text', (text) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'text',
          data: text
        }));
      }
    });

    geminiClient.on('error', (error) => {
      console.error('Gemini client error:', error);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    // Connect to Gemini
    await geminiClient.connect();

    // Send ready message to client
    ws.send(JSON.stringify({
      type: 'ready',
      message: 'Connected to Gemini Live API'
    }));

    // Handle messages from client
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'audio':
            // Forward audio to Gemini
            if (geminiClient && data.data) {
              await geminiClient.sendAudio(data.data);
            }
            break;

          case 'text':
            // Forward text to Gemini
            if (geminiClient && data.data) {
              await geminiClient.sendText(data.data);
            }
            break;

          case 'config':
            // Handle configuration updates
            console.log('Received config:', data.data);
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      if (geminiClient) {
        geminiClient.disconnect();
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

  } catch (error) {
    console.error('Error setting up connection:', error);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to Gemini Live API'
      }));
      ws.close();
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
