import { ToolsConfig, ToolExecutionResult } from '../types';
import { Logger } from '../utils/logger';
import { MCPClient } from './mcp-client';

export class ToolManager {
  private config: ToolsConfig | null = null;
  private builtinToolHandlers: Map<string, (args: any) => Promise<any>> = new Map();
  private mcpClients: Map<string, MCPClient> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Load tools from config
   */
  loadTools(config: ToolsConfig): void {
    this.config = config;
    this.logger.info('Tools loaded', {
      mcpServers: config.mcpServers.length,
      builtinTools: config.builtinTools.length
    });
  }

  /**
   * Get loaded tools config
   */
  getTools(): ToolsConfig {
    if (!this.config) {
      throw new Error('Tools not loaded. Call loadTools() first.');
    }
    return this.config;
  }

  /**
   * Get tool definitions in OpenAI format
   */
  getToolDefinitions(): any[] {
    if (!this.config) {
      return [];
    }

    const definitions: any[] = [];

    // Add builtin tools
    for (const tool of this.config.builtinTools) {
      definitions.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: this.convertParametersToJsonSchema(tool.parameters),
            required: tool.parameters.filter(p => p.required).map(p => p.name)
          }
        }
      });
    }

    // Add MCP tools (would need to fetch from MCP server)
    // For now, just add placeholders
    for (const server of this.config.mcpServers) {
      // In a real implementation, you would fetch tool definitions from the MCP server
      this.logger.debug(`MCP server ${server.name} tools would be added here`);
    }

    return definitions;
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, args: any): Promise<ToolExecutionResult> {
    this.logger.info(`Executing tool: ${name}`, { args });

    try {
      // Check if it's a builtin tool
      if (this.builtinToolHandlers.has(name)) {
        const handler = this.builtinToolHandlers.get(name)!;
        const result = await handler(args);
        return {
          success: true,
          result
        };
      }

      // Check if it's an MCP tool (format: server-name/tool-name)
      if (name.includes('/')) {
        const [serverName, toolName] = name.split('/');
        if (this.mcpClients.has(serverName)) {
          const client = this.mcpClients.get(serverName)!;
          const result = await client.callTool(toolName, args);
          return {
            success: true,
            result
          };
        }
      }

      // Tool not found
      this.logger.error(`Tool not found: ${name}`);
      return {
        success: false,
        error: `Tool ${name} not found`
      };
    } catch (error: any) {
      this.logger.error(`Tool execution failed: ${name}`, { error: error.message });
      return {
        success: false,
        error: error.message || 'Tool execution failed'
      };
    }
  }

  /**
   * Register a builtin tool handler
   */
  registerBuiltinTool(name: string, handler: (args: any) => Promise<any>): void {
    this.logger.info(`Registering builtin tool: ${name}`);
    this.builtinToolHandlers.set(name, handler);
  }

  /**
   * Register an MCP client for a server
   */
  registerMCPClient(serverName: string, client: MCPClient): void {
    this.logger.info(`Registering MCP client for server: ${serverName}`);
    this.mcpClients.set(serverName, client);
  }

  /**
   * Convert tool parameters to JSON Schema
   */
  private convertParametersToJsonSchema(parameters: any[]): Record<string, any> {
    const properties: Record<string, any> = {};
    
    for (const param of parameters) {
      properties[param.name] = {
        type: param.type,
        description: param.description || ''
      };
    }

    return properties;
  }

  /**
   * Validate tool arguments against parameters
   */
  private validateArgs(toolName: string, args: any, parameters: any[]): string[] {
    const errors: string[] = [];

    for (const param of parameters) {
      if (param.required && !(param.name in args)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }
    }

    return errors;
  }

  /**
   * Get list of registered tool names
   */
  getRegisteredToolNames(): string[] {
    const names: string[] = [];

    // Add builtin tools
    for (const name of this.builtinToolHandlers.keys()) {
      names.push(name);
    }

    // Add MCP tools
    for (const [serverName, client] of this.mcpClients.entries()) {
      // In a real implementation, you would get tool names from the client
      this.logger.debug(`MCP server ${serverName} tools would be listed here`);
    }

    return names;
  }

  /**
   * Clear all tools
   */
  clearTools(): void {
    this.config = null;
    this.builtinToolHandlers.clear();
    this.mcpClients.clear();
    this.logger.info('All tools cleared');
  }
}
