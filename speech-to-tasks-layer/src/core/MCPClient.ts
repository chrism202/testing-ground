import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Task, TaskResult, IMCPClient, MCPServerConfig } from '../types';

/**
 * Client for interacting with MCP servers to execute tasks
 */
export class MCPClient implements IMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private config: MCPServerConfig;
  private connected: boolean = false;
  private availableTools: Map<string, any> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      if (this.config.transport === 'stdio' && this.config.serverPath) {
        this.transport = new StdioClientTransport({
          command: this.config.serverPath,
          args: this.config.args || [],
          env: this.config.env,
        });

        this.client = new Client(
          {
            name: 'speech-to-tasks-layer',
            version: '1.0.0',
          },
          {
            capabilities: {},
          }
        );

        await this.client.connect(this.transport);
        this.connected = true;

        await this.loadAvailableTools();
      } else {
        throw new Error('Only stdio transport is currently supported');
      }
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.close();
      this.connected = false;
      this.client = null;
      this.transport = null;
      this.availableTools.clear();
    } catch (error) {
      throw new Error(`Failed to disconnect from MCP server: ${error}`);
    }
  }

  /**
   * Load available tools from the MCP server
   */
  private async loadAvailableTools(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const response = await this.client.listTools();
      this.availableTools.clear();

      if (response.tools) {
        for (const tool of response.tools) {
          this.availableTools.set(tool.name, tool);
        }
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }

  /**
   * Execute a task using the appropriate MCP tool
   */
  async executeTask(task: Task): Promise<TaskResult> {
    if (!this.connected || !this.client) {
      throw new Error('MCP client not connected');
    }

    const startTime = Date.now();

    try {
      const toolName = this.mapIntentToTool(task.intent);
      const tool = this.availableTools.get(toolName);

      if (!tool) {
        throw new Error(`No tool available for intent: ${task.intent}`);
      }

      const response = await this.client.callTool({
        name: toolName,
        arguments: task.parameters,
      });

      const executionTime = Date.now() - startTime;

      return {
        taskId: task.id,
        success: true,
        data: response.content,
        executionTime,
        timestamp: Date.now(),
        metadata: {
          toolName,
          toolSchema: tool,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        taskId: task.id,
        success: false,
        data: { error: (error as Error).message },
        executionTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Map task intent to MCP tool name
   * This is a basic mapping - should be customized based on your MCP server
   */
  private mapIntentToTool(intent: string): string {
    const intentToToolMap: Record<string, string> = {
      search_web: 'web_search',
      file_operation: 'file_manager',
      calculate: 'calculator',
      get_data: 'data_retriever',
      send_message: 'messenger',
      execute_code: 'code_executor',
      api_request: 'api_client',
      reminder: 'reminder_service',
    };

    return intentToToolMap[intent] || intent;
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }

    return Array.from(this.availableTools.keys());
  }

  /**
   * Get tool details
   */
  getTool(toolName: string): any {
    return this.availableTools.get(toolName);
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Refresh the list of available tools
   */
  async refreshTools(): Promise<void> {
    await this.loadAvailableTools();
  }

  /**
   * Check if a specific tool is available
   */
  hasToolForIntent(intent: string): boolean {
    const toolName = this.mapIntentToTool(intent);
    return this.availableTools.has(toolName);
  }
}
