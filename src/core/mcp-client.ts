import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';

export class MCPClient {
  private client: AxiosInstance;
  private serverName: string;
  private logger: Logger;

  constructor(serverName: string, baseURL: string, logger?: Logger) {
    this.serverName = serverName;
    this.logger = logger || new Logger();
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.logger.info(`MCP Client initialized for server: ${serverName}`, { baseURL });
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: any): Promise<any> {
    this.logger.info(`Calling MCP tool: ${this.serverName}/${toolName}`, { args });

    try {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        },
        id: this.generateRequestId()
      };

      const response = await this.client.post('', requestBody);

      if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
      }

      this.logger.info(`MCP tool call successful: ${this.serverName}/${toolName}`);
      return response.data.result;
    } catch (error: any) {
      this.logger.error(`MCP tool call failed: ${this.serverName}/${toolName}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<any[]> {
    this.logger.info(`Listing tools from MCP server: ${this.serverName}`);

    try {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: this.generateRequestId()
      };

      const response = await this.client.post('', requestBody);

      if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
      }

      return response.data.result.tools || [];
    } catch (error: any) {
      this.logger.error(`Failed to list tools from ${this.serverName}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `${this.serverName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server name
   */
  getServerName(): string {
    return this.serverName;
  }

  /**
   * Update base URL
   */
  updateBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
    this.logger.info(`Updated base URL for ${this.serverName}`, { baseURL });
  }
}
