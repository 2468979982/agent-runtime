import { MCPClient } from '../../src/core/mcp-client';
import axios, { AxiosInstance } from 'axios';

// Mock axios module
jest.mock('axios');

// Create mock for axios instance
const mockPost = jest.fn();
const mockAxiosInstance = {
  post: mockPost,
  defaults: { baseURL: '' }
} as any;

// Make axios.create return our mock instance
(axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

describe('MCPClient', () => {
  let mcpClient: MCPClient;
  const serverName = 'test-server';
  const baseURL = 'http://localhost:3000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.defaults.baseURL = baseURL;
    mcpClient = new MCPClient(serverName, baseURL);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with server name and base URL', () => {
      expect(mcpClient).toBeDefined();
      expect(mcpClient.getServerName()).toBe(serverName);
    });
  });

  describe('callTool', () => {
    it('should call MCP tool and return result', async () => {
      const mockResponse = {
        data: {
          jsonrpc: '2.0',
          result: { weather: 'sunny', temperature: 25 },
          id: 'test-server-123-abc'
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await mcpClient.callTool('get_weather', {
        location: 'Beijing'
      });

      expect(result).toEqual({ weather: 'sunny', temperature: 25 });
      expect(mockPost).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'get_weather',
            arguments: { location: 'Beijing' }
          }
        })
      );
    });

    it('should throw error if MCP returns error', async () => {
      const mockResponse = {
        data: {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request'
          },
          id: 'test-server-123-abc'
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(
        mcpClient.callTool('get_weather', {})
      ).rejects.toThrow('MCP Error: Invalid request');
    });

    it('should handle network errors', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await expect(
        mcpClient.callTool('get_weather', {})
      ).rejects.toThrow('Network error');
    });
  });

  describe('listTools', () => {
    it('should list available tools from MCP server', async () => {
      const mockResponse = {
        data: {
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'get_weather',
                description: 'Get weather for a location',
                inputSchema: {
                  type: 'object',
                  properties: {
                    location: { type: 'string' }
                  }
                }
              }
            ]
          },
          id: 'test-server-123-abc'
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const tools = await mcpClient.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get_weather');
    });

    it('should throw error if listTools fails', async () => {
      const mockResponse = {
        data: {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request'
          },
          id: 'test-server-123-abc'
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(mcpClient.listTools()).rejects.toThrow('MCP Error: Invalid request');
    });
  });

  describe('updateBaseURL', () => {
    it('should update base URL', () => {
      const newURL = 'http://localhost:4000';
      mcpClient.updateBaseURL(newURL);
      
      // No error means success
      expect(mockAxiosInstance.defaults.baseURL).toBe(newURL);
    });
  });
});
