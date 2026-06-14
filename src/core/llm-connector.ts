import OpenAI from 'openai';
import { LLMConfig, Message, ChatResponse } from '../types';
import { Logger } from '../utils/logger';

export class LLMConnector {
  private client: OpenAI;
  private config: LLMConfig;
  private logger: Logger;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // ms
  private mock: boolean = false;

  constructor(config: LLMConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger();
    this.mock = config.mock || false;

    // Initialize OpenAI client
    const clientConfig: any = {
      apiKey: config.apiKey,
      timeout: 60000 // 60 seconds timeout
    };

    // If using OpenAI-compatible API, set base URL
    if (config.provider === 'openai-compatible' && config.baseURL) {
      clientConfig.baseURL = config.baseURL;
    }

    this.client = new OpenAI(clientConfig);
  }

  /**
   * Send chat request to LLM
   */
  async chat(messages: Message[], tools?: any[]): Promise<ChatResponse> {
    // Mock mode: return mock response
    if (this.mock) {
      this.logger.info('Mock mode: returning mock response', {
        messageCount: messages.length
      });
      
      // Return mock response
      return {
        content: `[Mock] I received your message: "${messages[messages.length - 1]?.content || ''}". This is a mock response from LLM.`,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      };
    }

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        this.logger.info(`Sending chat request to LLM (attempt ${attempt + 1})`, {
          model: this.config.model,
          messageCount: messages.length,
          hasTools: !!tools?.length
        });

        const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
          model: this.config.model,
          messages: this.convertMessages(messages),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        };

        // Add tools if provided
        if (tools && tools.length > 0) {
          requestParams.tools = tools;
        }

        const response = await this.client.chat.completions.create(requestParams);

        this.logger.info('Received LLM response', {
          usage: response.usage
        });

        return this.parseResponse(response);
      } catch (error: any) {
        lastError = error;
        
        this.logger.warn(`LLM API call failed (attempt ${attempt + 1})`, {
          error: error.message,
          status: error.status
        });

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === this.maxRetries - 1) {
          break;
        }

        // Wait before retry
        await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    // All retries failed
    this.logger.error('All LLM API retries failed', { error: lastError?.message });
    throw new Error(`LLM API call failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Convert internal message format to OpenAI format
   */
  private convertMessages(messages: Message[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId || ''
        } as any;
      }

      if (msg.role === 'assistant' && msg.toolCalls) {
        return {
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        } as any;
      }

      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      } as any;
    });
  }

  /**
   * Parse OpenAI response to internal format
   */
  private parseResponse(response: OpenAI.Chat.ChatCompletion): ChatResponse {
    const choice = response.choices[0];
    
    if (!choice) {
      throw new Error('No choice in LLM response');
    }

    const result: ChatResponse = {
      content: choice.message.content || ''
    };

    // Parse tool calls if present
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      result.toolCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function?.name || '',
          arguments: tc.function?.arguments || '{}'
        }
      }));
    }

    // Parse usage if present
    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      };
    }

    return result;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limit errors
    if (error.status === 429) {
      return true;
    }

    // Server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    return false;
  }

  /**
   * Delay helper for retry
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize client if API key or base URL changed
    if (newConfig.apiKey || newConfig.baseURL) {
      const clientConfig: any = {
        apiKey: this.config.apiKey
      };

      if (this.config.baseURL) {
        clientConfig.baseURL = this.config.baseURL;
      }

      this.client = new OpenAI(clientConfig);
    }
  }

  /**
   * Set max retries
   */
  setMaxRetries(max: number): void {
    this.maxRetries = max;
  }

  /**
   * Set retry delay
   */
  setRetryDelay(delayMs: number): void {
    this.retryDelay = delayMs;
  }
}
