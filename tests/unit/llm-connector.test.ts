import { LLMConnector } from '../../src/core/llm-connector';
import { LLMConfig, Message, ChatResponse } from '../../src/types';
import OpenAI from 'openai';

// Mock the OpenAI module
jest.mock('openai');

describe('LLMConnector', () => {
  let llmConnector: LLMConnector;
  let mockOpenAI: jest.MockedClass<typeof OpenAI>;
  let mockChatCompletions: any;

  const testConfig: LLMConfig = {
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup OpenAI mock
    mockChatCompletions = {
      create: jest.fn()
    };
    
    mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
    mockOpenAI.prototype.chat = {
      completions: mockChatCompletions
    } as any;

    llmConnector = new LLMConnector(testConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with OpenAI compatible API', () => {
      const config: LLMConfig = {
        provider: 'openai-compatible',
        apiKey: 'test-key',
        baseURL: 'http://localhost:8000',
        model: 'local-model'
      };

      const connector = new LLMConnector(config);
      expect(connector).toBeDefined();
    });

    it('should initialize with OpenAI API', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4'
      };

      const connector = new LLMConnector(config);
      expect(connector).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should call LLM API and return response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you?',
              role: 'assistant'
            }
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const response: ChatResponse = await llmConnector.chat(messages);

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.usage).toBeDefined();
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(20);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "Beijing"}'
                  }
                }
              ]
            }
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40
        }
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'What is the weather in Beijing?' }
      ];

      const response: ChatResponse = await llmConnector.chat(messages);

      expect(response.content).toBe('');
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].id).toBe('call_123');
      expect(response.toolCalls![0].function.name).toBe('get_weather');
    });

    it('should pass tools parameter to API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Tool result processed',
              role: 'assistant'
            }
          }
        ]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Get weather' }
      ];

      const tools = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather for a location',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' }
              }
            }
          }
        }
      ];

      await llmConnector.chat(messages, tools);

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: tools
        })
      );
    });

    it('should handle API errors', async () => {
      mockChatCompletions.create.mockRejectedValue(new Error('API Error'));

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(llmConnector.chat(messages)).rejects.toThrow('LLM API call failed');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockChatCompletions.create.mockRejectedValue(rateLimitError);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(llmConnector.chat(messages)).rejects.toThrow('Rate limit exceeded');
    });

    it('should use custom temperature and max tokens', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response with custom params',
              role: 'assistant'
            }
          }
        ]
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await llmConnector.chat(messages);

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 2000
        })
      );
    });
  });

  describe('error handling', () => {
    it('should retry on transient errors', async () => {
      // First call fails with retryable error, second succeeds
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      mockChatCompletions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success after retry', role: 'assistant' } }]
        });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const response = await llmConnector.chat(messages);
      
      expect(response.content).toBe('Success after retry');
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(2);
    });
  });
});
