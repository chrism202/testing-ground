#!/usr/bin/env python3
"""
Stub MCP Server with three functions:
- check_weather: Returns weather information
- add_to_calendar: Adds events to calendar
- check_price: Checks price information

Each function has two possible responses based on input,
with a random delay of 0-5 seconds.
"""

import asyncio
import random
from typing import Any

from mcp.server import Server
from mcp.types import Tool, TextContent
import mcp.server.stdio


# Create server instance
server = Server("stub-mcp-server")


async def add_random_delay():
    """Add a random delay between 0 and 5 seconds"""
    delay = random.uniform(0, 5)
    await asyncio.sleep(delay)


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools"""
    return [
        Tool(
            name="check_weather",
            description="Check weather conditions for a location. Provide 'location' parameter (e.g., 'New York' or 'London').",
            inputSchema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city or location to check weather for"
                    }
                },
                "required": ["location"]
            }
        ),
        Tool(
            name="add_to_calendar",
            description="Add an event to calendar. Provide 'event' and 'date' parameters.",
            inputSchema={
                "type": "object",
                "properties": {
                    "event": {
                        "type": "string",
                        "description": "The event name or description"
                    },
                    "date": {
                        "type": "string",
                        "description": "The date for the event (e.g., '2025-12-15')"
                    }
                },
                "required": ["event", "date"]
            }
        ),
        Tool(
            name="check_price",
            description="Check price for a product or service. Provide 'item' parameter.",
            inputSchema={
                "type": "object",
                "properties": {
                    "item": {
                        "type": "string",
                        "description": "The product or service to check price for"
                    }
                },
                "required": ["item"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool calls"""

    # Add random delay
    await add_random_delay()

    if name == "check_weather":
        location = arguments.get("location", "").lower()

        # Return different responses based on input
        if "new york" in location or "ny" in location or "nyc" in location:
            response = f"Weather in {arguments['location']}:\n🌤️ Partly cloudy\n🌡️ Temperature: 72°F (22°C)\n💧 Humidity: 65%\n💨 Wind: 8 mph NE\n🌅 Sunrise: 6:42 AM\n🌇 Sunset: 7:18 PM"
        else:
            response = f"Weather in {arguments['location']}:\n⛈️ Thunderstorms\n🌡️ Temperature: 58°F (14°C)\n💧 Humidity: 85%\n💨 Wind: 15 mph SW\n⚠️ Weather Alert: Heavy rain expected"

        return [TextContent(type="text", text=response)]

    elif name == "add_to_calendar":
        event = arguments.get("event", "").lower()
        date = arguments.get("date", "")

        # Return different responses based on input
        if "meeting" in event or "call" in event or "conference" in event:
            response = f"✅ Successfully added to calendar!\n📅 Event: {arguments['event']}\n📆 Date: {date}\n⏰ Time: 10:00 AM - 11:00 AM\n📍 Location: Conference Room A\n🔔 Reminder set for 15 minutes before"
        else:
            response = f"✅ Event added to calendar!\n📅 Event: {arguments['event']}\n📆 Date: {date}\n⏰ Time: All Day Event\n📝 Note: No location specified\n🔔 Reminder set for 1 day before"

        return [TextContent(type="text", text=response)]

    elif name == "check_price":
        item = arguments.get("item", "").lower()

        # Return different responses based on input
        if "laptop" in item or "computer" in item or "macbook" in item:
            response = f"💰 Price check for: {arguments['item']}\n\n💵 Current Price: $1,299.00\n📊 Market Average: $1,350.00\n📉 Price Trend: Down 5% this month\n⭐ Rating: 4.5/5 stars\n✅ In Stock: Yes\n🚚 Free shipping available"
        else:
            response = f"💰 Price check for: {arguments['item']}\n\n💵 Current Price: $49.99\n📊 Market Average: $55.00\n📈 Price Trend: Stable\n⭐ Rating: 4.0/5 stars\n⚠️ Stock: Limited availability\n📦 Shipping: $5.99"

        return [TextContent(type="text", text=response)]

    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    """Main entry point for the server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
