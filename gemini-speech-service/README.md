# Gemini Live Speech Service

A real-time speech-to-speech service using Google's Gemini Live API. Talk to Gemini as naturally as you would to another person, with true speech-to-speech capabilities powered by WebSockets.

## Features

- Real-time speech-to-speech conversation with Gemini
- Low-latency bidirectional audio streaming
- WebSocket-based architecture
- Visual audio waveform display
- Easy deployment to Mac or EC2
- Docker support for containerized deployment

## Architecture

```
┌──────────────┐        WebSocket         ┌──────────────┐        WebSocket         ┌──────────────┐
│              │◄──────────────────────────►│              │◄──────────────────────────►│              │
│  Web Client  │      Audio (PCM16)         │ Node.js      │      Audio Streaming       │   Gemini     │
│  (Browser)   │                            │   Server     │                            │  Live API    │
│              │◄──────────────────────────►│              │◄──────────────────────────►│              │
└──────────────┘                            └──────────────┘                            └──────────────┘
```

## Prerequisites

- Node.js 18+ or Docker
- A Google AI API key with Gemini Live API access
- Microphone access (for local usage)
- Modern web browser (Chrome, Safari, Edge, Firefox)

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Local Setup (Mac/Linux)

### 1. Clone and Navigate

```bash
cd gemini-speech-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
PORT=3000
```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 5. Open in Browser

Navigate to `http://localhost:3000` in your browser.

## Docker Deployment

### Local Docker Run

```bash
# Build the image
docker build -t gemini-speech-service .

# Run the container
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_api_key_here \
  gemini-speech-service
```

### Using Docker Compose

```bash
# Make sure .env file exists with your API key
docker-compose up -d
```

To stop:

```bash
docker-compose down
```

## EC2 Deployment

### Method 1: Direct Node.js Installation

1. **Launch EC2 Instance**
   - Amazon Linux 2023 or Ubuntu 22.04
   - t3.small or larger recommended
   - Security group: Allow inbound on port 3000 (or 80/443)

2. **SSH into Instance**

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

3. **Install Node.js**

For Amazon Linux 2023:
```bash
sudo dnf install nodejs npm -y
```

For Ubuntu:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. **Clone and Setup**

```bash
git clone <your-repo-url>
cd gemini-speech-service
npm install
```

5. **Configure Environment**

```bash
cp .env.example .env
nano .env  # Edit with your API key
```

6. **Run with PM2 (Production)**

```bash
# Install PM2
sudo npm install -g pm2

# Start the service
pm2 start src/server.js --name gemini-speech

# Setup auto-start on reboot
pm2 startup
pm2 save
```

7. **Configure Nginx (Optional - for HTTPS)**

```bash
sudo dnf install nginx -y  # Amazon Linux
# or
sudo apt install nginx -y  # Ubuntu

# Configure nginx as reverse proxy
sudo nano /etc/nginx/conf.d/gemini-speech.conf
```

Example nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Method 2: Docker on EC2

1. **SSH into Instance**

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

2. **Install Docker**

For Amazon Linux 2023:
```bash
sudo dnf install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
```

For Ubuntu:
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ubuntu
```

Log out and back in for group changes to take effect.

3. **Clone and Run**

```bash
git clone <your-repo-url>
cd gemini-speech-service
```

Create `.env` file:
```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Start with Docker Compose:
```bash
docker-compose up -d
```

4. **Access the Service**

Navigate to `http://your-ec2-public-ip:3000`

## Usage

1. Click "Connect" to establish connection to the Gemini Live API
2. Grant microphone permission when prompted
3. Click "Start Talking" to begin speaking
4. Gemini will respond with speech in real-time
5. Click "Stop Talking" when you're done
6. View the transcript of your conversation

## Configuration Options

### Environment Variables

- `GEMINI_API_KEY` (required): Your Google AI API key
- `GEMINI_MODEL` (optional): Model to use (default: `gemini-2.0-flash-exp`)
  - Options: `gemini-2.0-flash-exp`, `gemini-2.5-flash-native-audio-preview-09-2025`
- `PORT` (optional): Server port (default: `3000`)

### Available Gemini Voices

The service uses the "Aoede" voice by default. You can change this in `src/gemini-client.js` by modifying the `voiceName` field. Available voices can be found in the [Gemini Live API documentation](https://ai.google.dev/gemini-api/docs/live).

## Troubleshooting

### Microphone Not Working

- Ensure you've granted microphone permissions in your browser
- Check browser console for errors
- Try HTTPS instead of HTTP (required by some browsers)

### Connection Errors

- Verify your API key is correct
- Check that your API key has access to Gemini Live API
- Ensure port 3000 is not blocked by firewall

### Audio Not Playing

- Check browser audio permissions
- Ensure your system volume is up
- Try refreshing the page and reconnecting

### EC2 Connection Issues

- Verify security group allows inbound traffic on port 3000
- Check that the service is running: `pm2 status` or `docker ps`
- Review logs: `pm2 logs gemini-speech` or `docker-compose logs`

## API Reference

### WebSocket Messages

**Client to Server:**

```json
{
  "type": "audio",
  "data": "base64_encoded_pcm16_audio"
}
```

```json
{
  "type": "text",
  "data": "text message"
}
```

**Server to Client:**

```json
{
  "type": "ready",
  "message": "Connected to Gemini Live API"
}
```

```json
{
  "type": "audio",
  "data": "base64_encoded_pcm16_audio"
}
```

```json
{
  "type": "text",
  "data": "text response"
}
```

```json
{
  "type": "error",
  "message": "error description"
}
```

## Development

### Project Structure

```
gemini-speech-service/
├── src/
│   ├── server.js          # Express + WebSocket server
│   └── gemini-client.js   # Gemini Live API client wrapper
├── public/
│   ├── index.html         # Web client UI
│   └── client.js          # Client-side JavaScript
├── .env.example           # Environment template
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
├── package.json           # Node.js dependencies
└── README.md             # This file
```

### Running Tests

```bash
# Start the server
npm start

# In another terminal, check health endpoint
curl http://localhost:3000/health
```

## Security Considerations

- Never commit `.env` file or expose API keys
- Use HTTPS in production
- Consider implementing rate limiting
- Use ephemeral tokens instead of API keys for client-side auth in production
- Configure CORS appropriately for your domain

## Performance Tips

- Use a CDN for static assets in production
- Enable gzip compression in nginx
- Monitor EC2 instance metrics and scale as needed
- Consider using AWS ECS or EKS for high-availability deployments

## Resources

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [Live API WebSocket Reference](https://ai.google.dev/api/live)
- [Google AI for Developers](https://ai.google.dev/)
- [Gemini Live API Guide 2025](https://binaryverseai.com/gemini-live-api-guide/)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
