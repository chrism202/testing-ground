#!/usr/bin/env python3
"""
Simple test client for the stub MCP server.
This script tests all three functions with different inputs.
"""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def test_server():
    """Test the stub MCP server"""

    # Create server parameters
    server_params = StdioServerParameters(
        command="python",
        args=["server.py"],
        env=None
    )

    print("🚀 Starting MCP Stub Server Test...\n")

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the session
            await session.initialize()

            # List available tools
            tools = await session.list_tools()
            print("📋 Available tools:")
            for tool in tools.tools:
                print(f"  - {tool.name}: {tool.description}")
            print()

            # Test 1: Check weather for New York (Response A)
            print("🌤️  Test 1: Checking weather for New York...")
            result = await session.call_tool("check_weather", {"location": "New York"})
            print(f"Result:\n{result.content[0].text}\n")

            # Test 2: Check weather for London (Response B)
            print("🌧️  Test 2: Checking weather for London...")
            result = await session.call_tool("check_weather", {"location": "London"})
            print(f"Result:\n{result.content[0].text}\n")

            # Test 3: Add meeting to calendar (Response A)
            print("📅 Test 3: Adding team meeting to calendar...")
            result = await session.call_tool("add_to_calendar", {
                "event": "Team Meeting",
                "date": "2025-12-15"
            })
            print(f"Result:\n{result.content[0].text}\n")

            # Test 4: Add personal event to calendar (Response B)
            print("📆 Test 4: Adding birthday to calendar...")
            result = await session.call_tool("add_to_calendar", {
                "event": "Birthday Party",
                "date": "2025-12-20"
            })
            print(f"Result:\n{result.content[0].text}\n")

            # Test 5: Check price for laptop (Response A)
            print("💻 Test 5: Checking price for MacBook Pro...")
            result = await session.call_tool("check_price", {"item": "MacBook Pro"})
            print(f"Result:\n{result.content[0].text}\n")

            # Test 6: Check price for generic item (Response B)
            print("📦 Test 6: Checking price for headphones...")
            result = await session.call_tool("check_price", {"item": "Wireless Headphones"})
            print(f"Result:\n{result.content[0].text}\n")

            print("✅ All tests completed successfully!")
            print("⏱️  Note: Each request included a random delay of 0-5 seconds")


if __name__ == "__main__":
    asyncio.run(test_server())
