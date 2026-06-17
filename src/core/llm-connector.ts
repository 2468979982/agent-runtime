import OpenAI from 'openai';
import { LLMConfig, Message, ChatResponse } from '../types';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class LLMConnector {
  private config: LLMConfig;
  private logger: Logger;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // ms
  private mock: boolean = false;

  constructor(config: LLMConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger();
    this.mock = config.mock || false;

    // Debug: print config.mock
    this.writeDebugLog('LLMConnector.constructor()', {
      'config.mock': config.mock,
      'this.mock': this.mock
    });

    // Read API key and base URL from environment variables (override config if present)
    let apiKey = config.apiKey;
    let baseURL = config.baseURL || '';

    // Expand ${ENV:...} references in apiKey
    if (apiKey && apiKey.startsWith('${ENV:') && apiKey.endsWith('}')) {
      const envVarName = apiKey.substring(7, apiKey.length - 1);
      apiKey = process.env[envVarName] || '';
      this.writeDebugLog('LLMConnector.constructor() - expanded apiKey', {
        'envVarName': envVarName,
        'expanded': apiKey ? '***' + apiKey.substr(-4) : '(empty)'
      });
    }

    // Override with process.env values if present
    if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
      this.writeDebugLog('LLMConnector.constructor() - using process.env.OPENAI_API_KEY', {});
    }

    if (process.env.BASE_URL) {
      baseURL = process.env.BASE_URL;
      this.writeDebugLog('LLMConnector.constructor() - using process.env.BASE_URL', {
        'baseURL': baseURL
      });
    }

    if (!apiKey) {
      throw new Error('LLM API key not found. Set OPENAI_API_KEY in .env or config file.');
    }

    // Debug: print final config
    this.writeDebugLog('LLMConnector.constructor() - final config', {
      'this.config.model': this.config.model,
      'this.config.apiKey': this.config.apiKey ? '***' + this.config.apiKey.substr(-4) : '(empty)',
      'this.config.baseURL': this.config.baseURL,
      'this.mock': this.mock
    });
  }

  /**
   * Write debug log to file (guaranteed to execute)
   */
  private writeDebugLog(method: string, data: any): void {
    try {
      // Use absolute path for logs directory
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logPath = path.join(logDir, `llm-connector-debug-${Date.now()}.json`);
      const logData = {
        timestamp: new Date().toISOString(),
        method,
        data,
        pid: process.pid,
        ppid: process.ppid
      };

      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));

      // Also log to console.error (goes to stderr, not buffered)
      console.error(`[LLMConnector] ${method} - debug log written to: ${logPath}`);
    } catch (error: any) {
      console.error(`[LLMConnector] Failed to write debug log: ${error.message}`);
    }
  }

  /**
   * Send chat request to LLM
   */
  async chat(messages: Message[], tools?: any[]): Promise<ChatResponse> {
    // Debug: print mock value (WRITE TO FILE to guarantee execution)
    this.writeDebugLog('chat() - start', {
      mock: this.mock,
      messageCount: messages.length,
      hasTools: !!tools?.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
    });

    // Log to console as well
    this.logger.info('LLMConnector.chat() called', {
      mock: this.mock,
      messageCount: messages.length
    });

    // Mock mode: return mock response
    if (this.mock) {
      this.writeDebugLog('chat() - mock mode', {
        messageCount: messages.length,
        mockResponse: '[Mock] This is a mock response from LLM.'
      });

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

        // Build request body
        const requestBody: any = {
          model: this.config.model,
          messages: this.convertMessages(messages),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        };

        if (tools && tools.length > 0) {
          requestBody.tools = tools;
        }

        // Write FULL request details to file (GUARANTEED to execute)
        const baseURL = this.config.baseURL || process.env.BASE_URL || 'https://api.openai.com/v1';
        const url = `${baseURL}/chat/completions`;
        this.writeDebugLog('chat() - request details', {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey ? '***' : '(empty)'}`
          },
          body: requestBody
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${response.status} ${errorText}`);
        }

        const responseData: any = await response.json();

        this.logger.info('Received LLM response', {
          usage: responseData.usage
        });

        // Write FULL response details to file (GUARANTEED to execute)
        this.writeDebugLog('chat() - response details', {
          status: response.status,
          usage: responseData.usage,
          choices: responseData.choices.map((c: any) => ({
            index: c.index,
            message: {
              role: c.message.role,
              content: c.message.content?.substring(0, 200)
            },
            finish_reason: c.finish_reason
          }))
        });

        // Convert fetch response to ChatResponse format
        const choices = responseData.choices || [];
        const firstChoice = choices[0] || {};
        const message = firstChoice.message || {};
        
        const chatResponse: ChatResponse = {
          content: message.content || '',
          toolCalls: message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '{}'
            }
          })) || undefined,
          usage: responseData.usage ? {
            promptTokens: responseData.usage.prompt_tokens || 0,
            completionTokens: responseData.usage.completion_tokens || 0,
            totalTokens: responseData.usage.total_tokens || 0
          } : undefined
        };

        return chatResponse;
      } catch (error: any) {
        lastError = error;

        this.logger.warn(`LLM API call failed (attempt ${attempt + 1})`, {
          error: error.message,
          status: error.status
        });

        // Write error details to file (GUARANTEED to execute)
        this.writeDebugLog('chat() - error', {
          attempt: attempt + 1,
          error: error.message,
          status: error.status,
          stack: error.stack?.substring(0, 500)
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
    this.writeDebugLog('chat() - all retries failed', {
      error: lastError?.message
    });
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
    this.mock = this.config.mock || false;

    this.writeDebugLog('updateConfig()', {
      newConfig,
      'this.mock': this.mock
    });

    // Reinitialize config if API key or base URL changed
    if (newConfig.apiKey || newConfig.baseURL) {
      this.logger.info('LLM config updated, will use new settings for next request');
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
