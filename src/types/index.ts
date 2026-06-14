// Agent Runtime Type Definitions

export interface AgentConfig {
  llm: LLMConfig;
  session: SessionConfig;
  logging: LoggingConfig;
}

export interface LLMConfig {
  provider: 'openai' | 'openai-compatible';
  apiKey: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  mock?: boolean; // Enable mock mode for testing
}

export interface SessionConfig {
  maxHistoryLength: number;
  sessionTTL?: number; // in seconds
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  file?: string;
}

export interface ToolsConfig {
  mcpServers: MCPServerConfig[];
  builtinTools: BuiltinToolConfig[];
}

export interface MCPServerConfig {
  name: string;
  url: string;
  description?: string;
}

export interface BuiltinToolConfig {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

export interface PromptConfig {
  systemPrompt: string;
  templates?: PromptTemplate[];
}

export interface PromptTemplate {
  name: string;
  template: string;
  variables?: string[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MCPToolRequest {
  jsonrpc: '2.0';
  method: string;
  params: {
    name: string;
    arguments: Record<string, any>;
  };
  id: string | number;
}

export interface MCPToolResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}
