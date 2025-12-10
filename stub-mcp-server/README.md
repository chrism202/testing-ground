# Stub MCP Server

A lightweight stub MCP (Model Context Protocol) server with three mock functions for testing and development purposes. The server responds with hardcoded data and includes random response delays (0-5 seconds) to simulate real-world API behavior.

## Features

### Available Tools

1. **check_weather** - Check weather conditions for a location
   - Returns different responses based on location input
   - Response A: Partly cloudy weather (triggered by "New York", "NY", "NYC")
   - Response B: Thunderstorm weather (triggered by other locations)

2. **add_to_calendar** - Add events to a calendar
   - Returns different responses based on event type
   - Response A: Scheduled meeting format (triggered by "meeting", "call", "conference")
   - Response B: All-day event format (triggered by other event types)

3. **check_price** - Check price information for products
   - Returns different responses based on item type
   - Response A: High-value electronics (triggered by "laptop", "computer", "macbook")
   - Response B: General products (triggered by other items)

### Random Delays

Each request includes a random delay between 0 and 5 seconds to simulate real-world API latency.

## Requirements

- Python 3.10 or higher
- Works on macOS, Linux, and EC2 servers

## Installation

### Option 1: Using pip

```bash
cd stub-mcp-server
pip install -r requirements.txt
```

### Option 2: Using uv (recommended for development)

```bash
cd stub-mcp-server
uv pip install -r requirements.txt
```

### Option 3: Using virtual environment

```bash
cd stub-mcp-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Server

### Direct execution

```bash
python server.py
```

### Make it executable (Unix/Mac)

```bash
chmod +x server.py
./server.py
```

## Configuration for Claude Desktop

To use this MCP server with Claude Desktop, add it to your Claude Desktop configuration:

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stub-server": {
      "command": "python",
      "args": [
        "/absolute/path/to/stub-mcp-server/server.py"
      ]
    }
  }
}
```

### Using uv (alternative)

```json
{
  "mcpServers": {
    "stub-server": {
      "command": "uv",
      "args": [
        "--directory",
        "/absolute/path/to/stub-mcp-server",
        "run",
        "server.py"
      ]
    }
  }
}
```

Replace `/absolute/path/to/stub-mcp-server` with the actual path to this directory.

## Example Usage

### Weather Check

**Input:**
```json
{
  "location": "New York"
}
```

**Output:**
```
Weather in New York:
🌤️ Partly cloudy
🌡️ Temperature: 72°F (22°C)
💧 Humidity: 65%
💨 Wind: 8 mph NE
🌅 Sunrise: 6:42 AM
🌇 Sunset: 7:18 PM
```

### Calendar Event

**Input:**
```json
{
  "event": "Team Meeting",
  "date": "2025-12-15"
}
```

**Output:**
```
✅ Successfully added to calendar!
📅 Event: Team Meeting
📆 Date: 2025-12-15
⏰ Time: 10:00 AM - 11:00 AM
📍 Location: Conference Room A
🔔 Reminder set for 15 minutes before
```

### Price Check

**Input:**
```json
{
  "item": "MacBook Pro"
}
```

**Output:**
```
💰 Price check for: MacBook Pro

💵 Current Price: $1,299.00
📊 Market Average: $1,350.00
📉 Price Trend: Down 5% this month
⭐ Rating: 4.5/5 stars
✅ In Stock: Yes
🚚 Free shipping available
```

## Deployment on EC2

### 1. Install Python

```bash
sudo yum update -y  # Amazon Linux
sudo yum install python3 python3-pip -y
```

### 2. Copy files to EC2

```bash
scp -r stub-mcp-server ec2-user@your-ec2-ip:/home/ec2-user/
```

### 3. Install dependencies

```bash
ssh ec2-user@your-ec2-ip
cd stub-mcp-server
pip3 install -r requirements.txt
```

### 4. Run the server

```bash
python3 server.py
```

## How It Works

The server uses the Model Context Protocol (MCP) to communicate with AI assistants. It:

1. Listens for tool calls via stdio (standard input/output)
2. Processes requests for the three available tools
3. Adds a random delay (0-5 seconds) before responding
4. Returns one of two hardcoded responses based on the input parameters
5. Communicates results back through the MCP protocol

## Development

The server is intentionally simple and uses hardcoded responses. You can modify `server.py` to:

- Add more response variations
- Adjust the delay range
- Add new tools/functions
- Customize response formats

## Troubleshooting

### Server won't start

- Ensure Python 3.10+ is installed: `python --version`
- Check that dependencies are installed: `pip list | grep mcp`
- Verify the path in your Claude Desktop config is absolute

### No response from tools

- Check Claude Desktop logs (Help → View Logs)
- Ensure the server process is running
- Verify stdio communication isn't blocked

## License

MIT
