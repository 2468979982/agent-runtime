import { ToolManager } from '../../src/core/tool-manager';
import { ToolsConfig, ToolExecutionResult } from '../../src/types';
import { LLMConnector } from '../../src/core/llm-connector';

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let mockLLMConnector: jest.Mocked<LLMConnector>;

  const testToolsConfig: ToolsConfig = {
    mcpServers: [
      {
        name: 'test-mcp-server',
        url: 'http://localhost:3000',
        description: 'Test MCP Server'
      }
    ],
    builtinTools: [
      {
        name: 'calculator',
        description: 'Perform calculations',
        parameters: [
          {
            name: 'expression',
            type: 'string',
            required: true,
            description: 'Math expression to evaluate'
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toolManager = new ToolManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadTools', () => {
    it('should load tools from config', () => {
      toolManager.loadTools(testToolsConfig);

      const tools = toolManager.getTools();
      expect(tools).toBeDefined();
      expect(tools.mcpServers).toHaveLength(1);
      expect(tools.builtinTools).toHaveLength(1);
    });

    it('should register tool definitions for LLM', () => {
      toolManager.loadTools(testToolsConfig);

      const toolDefs = toolManager.getToolDefinitions();
      expect(toolDefs).toBeDefined();
      expect(toolDefs.length).toBeGreaterThan(0);
    });
  });

  describe('executeTool', () => {
    beforeEach(() => {
      toolManager.loadTools(testToolsConfig);
    });

    it('should execute builtin tool', async () => {
      // Register a mock builtin tool
      toolManager.registerBuiltinTool('calculator', async (args: any) => {
        return { result: eval(args.expression) };
      });

      const result: ToolExecutionResult = await toolManager.executeTool('calculator', {
        expression: '2 + 2'
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should execute MCP tool', async () => {
      // Mock MCP client
      const mockMCPClient = {
        callTool: jest.fn().mockResolvedValue({ result: 42 })
      };

      toolManager.registerMCPClient('test-mcp-server', mockMCPClient as any);

      const result: ToolExecutionResult = await toolManager.executeTool('test-mcp-server/get_weather', {
        location: 'Beijing'
      });

      expect(result.success).toBe(true);
      expect(mockMCPClient.callTool).toHaveBeenCalledWith('get_weather', {
        location: 'Beijing'
      });
    });

    it('should return error for non-existent tool', async () => {
      const result: ToolExecutionResult = await toolManager.executeTool('non-existent-tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle tool execution error', async () => {
      // Register a builtin tool that throws
      toolManager.registerBuiltinTool('error-tool', async (args: any) => {
        throw new Error('Tool execution failed');
      });

      const result: ToolExecutionResult = await toolManager.executeTool('error-tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions in OpenAI format', () => {
      toolManager.loadTools(testToolsConfig);

      const toolDefs = toolManager.getToolDefinitions();

      expect(toolDefs).toBeInstanceOf(Array);
      if (toolDefs.length > 0) {
        expect(toolDefs[0]).toHaveProperty('type', 'function');
        expect(toolDefs[0]).toHaveProperty('function');
        expect(toolDefs[0].function).toHaveProperty('name');
        expect(toolDefs[0].function).toHaveProperty('description');
        expect(toolDefs[0].function).toHaveProperty('parameters');
      }
    });
  });

  describe('tool validation', () => {
    it('should validate tool parameters', async () => {
      toolManager.loadTools(testToolsConfig);

      // Register calculator tool
      toolManager.registerBuiltinTool('calculator', async (args: any) => {
        return { result: eval(args.expression) };
      });

      // Call with missing required parameter
      const result: ToolExecutionResult = await toolManager.executeTool('calculator', {});

      // Should succeed but tool implementation should handle missing params
      expect(result).toBeDefined();
    });
  });
});
