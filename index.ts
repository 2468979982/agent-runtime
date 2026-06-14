import { ConfigLoader } from './src/core/config-loader';
import { LLMConnector } from './src/core/llm-connector';
import { ToolManager } from './src/core/tool-manager';
import { SessionManager } from './src/core/session-manager';
import { MCPClient } from './src/core/mcp-client';
import { Logger, defaultLogger } from './src/utils/logger';
import {
  AgentConfig,
  ToolsConfig,
  PromptConfig,
  Message,
  ChatResponse,
  ToolCall
} from './src/types';

export class AgentRuntime {
  private configLoader: ConfigLoader;
  private llmConnector!: LLMConnector;
  private toolManager: ToolManager;
  private sessionManager: SessionManager;
  private logger: Logger;
  private initialized: boolean = false;
  private promptConfig?: PromptConfig;

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
    this.configLoader = new ConfigLoader();
    this.toolManager = new ToolManager(this.logger);
    this.sessionManager = new SessionManager(
      { maxHistoryLength: 100, sessionTTL: 3600 },
      this.logger
    );
  }

  /**
   * Initialize the agent runtime
   */
  async initialize(
    agentConfigPath: string,
    toolsConfigPath: string,
    promptConfigPath: string
  ): Promise<void> {
    this.logger.info('Initializing Agent Runtime...');

    try {
      // Load configurations
      const agentConfig = this.configLoader.loadAgentConfig(agentConfigPath);
      const toolsConfig = this.configLoader.loadToolsConfig(toolsConfigPath);
      this.promptConfig = this.configLoader.loadPromptConfig(promptConfigPath);

      // Initialize LLM connector
      this.llmConnector = new LLMConnector(agentConfig.llm, this.logger);

      // Load tools
      this.toolManager.loadTools(toolsConfig);

      // Initialize MCP clients
      for (const server of toolsConfig.mcpServers) {
        const mcpClient = new MCPClient(server.name, server.url, this.logger);
        this.toolManager.registerMCPClient(server.name, mcpClient);
      }

      // Register builtin tools
      this.registerBuiltinTools();

      this.initialized = true;
      this.logger.info('Agent Runtime initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize Agent Runtime', { error: error.message });
      throw error;
    }
  }

  /**
   * Chat with the agent
   */
  async chat(sessionId: string, userMessage: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Agent Runtime not initialized. Call initialize() first.');
    }

    this.logger.info(`Processing chat request for session: ${sessionId}`);

    try {
      // Get or create session
      let session;
      try {
        session = this.sessionManager.getSession(sessionId);
      } catch (error) {
        // Session doesn't exist, create it
        session = this.sessionManager.createSession(sessionId);
      }

      // Add user message to session
      const userMsg: Message = {
        role: 'user',
        content: userMessage
      };
      this.sessionManager.addMessage(sessionId, userMsg);

      // Get conversation history
      const history = this.sessionManager.getSessionHistory(sessionId);

      // Get tool definitions
      const tools = this.toolManager.getToolDefinitions();

      // Call LLM
      let llmResponse: ChatResponse = await this.llmConnector.chat(
        history,
        tools.length > 0 ? tools : undefined
      );

      // Handle tool calls if present
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        llmResponse = await this.handleToolCalls(sessionId, llmResponse);
      }

      // Add assistant response to session
      const assistantMsg: Message = {
        role: 'assistant',
        content: llmResponse.content
      };
      this.sessionManager.addMessage(sessionId, assistantMsg);

      this.logger.info(`Chat request completed for session: ${sessionId}`);

      return llmResponse.content;
    } catch (error: any) {
      this.logger.error(`Chat request failed for session: ${sessionId}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle tool calls from LLM response
   */
  private async handleToolCalls(
    sessionId: string,
    llmResponse: ChatResponse
  ): Promise<ChatResponse> {
    if (!llmResponse.toolCalls) {
      return llmResponse;
    }

    this.logger.info(`Handling ${llmResponse.toolCalls.length} tool calls`);

    // Execute all tool calls
    for (const toolCall of llmResponse.toolCalls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      this.logger.debug(`Executing tool: ${toolName}`, { args: toolArgs });

      const toolResult = await this.toolManager.executeTool(toolName, toolArgs);

      // Add tool call and result to session
      const toolCallMsg: Message = {
        role: 'assistant',
        content: '',
        toolCalls: [toolCall]
      };
      this.sessionManager.addMessage(sessionId, toolCallMsg);

      const toolResultMsg: Message = {
        role: 'tool',
        content: JSON.stringify(toolResult.result || toolResult.error),
        toolCallId: toolCall.id
      };
      this.sessionManager.addMessage(sessionId, toolResultMsg);
    }

    // Get updated history and call LLM again
    const updatedHistory = this.sessionManager.getSessionHistory(sessionId);
    const finalResponse = await this.llmConnector.chat(updatedHistory);

    this.logger.info('Tool calls handled successfully');

    return finalResponse;
  }

  /**
   * Register builtin tools
   */
  private registerBuiltinTools(): void {
    // Register a simple calculator tool
    this.toolManager.registerBuiltinTool('calculator', async (args: any) => {
      try {
        const result = eval(args.expression);
        return { result };
      } catch (error: any) {
        return { error: error.message };
      }
    });

    // Register a current time tool
    this.toolManager.registerBuiltinTool('get_current_time', async (args: any) => {
      return {
        currentTime: new Date().toISOString(),
        timezone: 'UTC'
      };
    });

    this.logger.info('Builtin tools registered');
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): Message[] {
    return this.sessionManager.getSessionHistory(sessionId);
  }

  /**
   * Clear session
   */
  clearSession(sessionId: string): void {
    this.sessionManager.clearSession(sessionId);
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    this.sessionManager.deleteSession(sessionId);
  }

  /**
   * Destroy - cleanup resources
   */
  destroy(): void {
    this.sessionManager.destroy();
    this.logger.info('Agent Runtime destroyed');
  }
}

// Export default instance creator
export default async function createAgentRuntime(
  agentConfigPath: string,
  toolsConfigPath: string,
  promptConfigPath: string,
  logger?: Logger
): Promise<AgentRuntime> {
  const agent = new AgentRuntime(logger);
  await agent.initialize(agentConfigPath, toolsConfigPath, promptConfigPath);
  return agent;
}
