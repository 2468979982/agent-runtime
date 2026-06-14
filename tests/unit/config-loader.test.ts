import { ConfigLoader } from '../../src/core/config-loader';
import * as fs from 'fs';
import * as path from 'path';

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  const testConfigDir = path.join(__dirname, 'test-configs');

  beforeEach(() => {
    configLoader = new ConfigLoader();
    // Create test config directory if it doesn't exist
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test config files
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('loadAgentConfig', () => {
    it('should load and parse agent config file', () => {
      // Set environment variable for this test
      process.env.OPENAI_API_KEY = 'test-key-12345';
      
      const configContent = {
        llm: {
          provider: 'openai',
          apiKey: '${ENV:OPENAI_API_KEY}',
          model: 'gpt-4',
          temperature: 0.7
        },
        session: {
          maxHistoryLength: 100
        },
        logging: {
          level: 'info'
        }
      };

      const configPath = path.join(testConfigDir, 'agent-config.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

      const config = configLoader.loadAgentConfig(configPath);

      expect(config).toBeDefined();
      expect(config.llm.provider).toBe('openai');
      expect(config.llm.model).toBe('gpt-4');
      expect(config.session.maxHistoryLength).toBe(100);
      
      delete process.env.OPENAI_API_KEY;
    });

    it('should throw error if config file does not exist', () => {
      const configPath = path.join(testConfigDir, 'non-existent.json');
      
      expect(() => {
        configLoader.loadAgentConfig(configPath);
      }).toThrow('Config file not found');
    });

    it('should throw error if config file is invalid JSON', () => {
      const configPath = path.join(testConfigDir, 'invalid-config.json');
      fs.writeFileSync(configPath, 'invalid json content');

      expect(() => {
        configLoader.loadAgentConfig(configPath);
      }).toThrow('Invalid JSON in config file');
    });
  });

  describe('loadToolsConfig', () => {
    it('should load tools config file', () => {
      const configContent = {
        mcpServers: [
          {
            name: 'test-server',
            url: 'http://localhost:3000',
            description: 'Test MCP Server'
          }
        ],
        builtinTools: []
      };

      const configPath = path.join(testConfigDir, 'tools-config.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

      const config = configLoader.loadToolsConfig(configPath);

      expect(config).toBeDefined();
      expect(config.mcpServers).toHaveLength(1);
      expect(config.mcpServers[0].name).toBe('test-server');
    });
  });

  describe('loadPromptConfig', () => {
    it('should load prompt config file', () => {
      const configContent = {
        systemPrompt: 'You are a helpful assistant.',
        templates: [
          {
            name: 'greeting',
            template: 'Hello {{name}}!',
            variables: ['name']
          }
        ]
      };

      const configPath = path.join(testConfigDir, 'prompt-config.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

      const config = configLoader.loadPromptConfig(configPath);

      expect(config).toBeDefined();
      expect(config.systemPrompt).toBe('You are a helpful assistant.');
      expect(config.templates).toHaveLength(1);
    });
  });

  describe('environment variable substitution', () => {
    it('should replace ${ENV:VAR_NAME} with environment variable value', () => {
      process.env.TEST_API_KEY = 'test-key-12345';
      
      const configContent = {
        llm: {
          provider: 'openai',
          apiKey: '${ENV:TEST_API_KEY}',
          model: 'gpt-4'
        },
        session: {
          maxHistoryLength: 100
        },
        logging: {
          level: 'info'
        }
      };

      const configPath = path.join(testConfigDir, 'agent-config-env.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

      const config = configLoader.loadAgentConfig(configPath);

      expect(config.llm.apiKey).toBe('test-key-12345');
      
      delete process.env.TEST_API_KEY;
    });

    it('should throw error if environment variable is not defined', () => {
      const configContent = {
        llm: {
          provider: 'openai',
          apiKey: '${ENV:NON_EXISTENT_VAR}',
          model: 'gpt-4'
        },
        session: {
          maxHistoryLength: 100
        },
        logging: {
          level: 'info'
        }
      };

      const configPath = path.join(testConfigDir, 'agent-config-env-error.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

      expect(() => {
        configLoader.loadAgentConfig(configPath);
      }).toThrow('Environment variable NON_EXISTENT_VAR is not defined');
    });
  });

  describe('config validation', () => {
    it('should validate required fields in agent config', () => {
      const invalidConfig = {
        llm: {
          // missing provider
          apiKey: 'test-key',
          model: 'gpt-4'
        },
        session: {
          maxHistoryLength: 100
        }
      };

      const configPath = path.join(testConfigDir, 'invalid-agent-config.json');
      fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      expect(() => {
        configLoader.loadAgentConfig(configPath);
      }).toThrow('Config validation failed');
    });

    it('should validate LLM provider value', () => {
      const invalidConfig = {
        llm: {
          provider: 'invalid-provider',
          apiKey: 'test-key',
          model: 'gpt-4'
        },
        session: {
          maxHistoryLength: 100
        },
        logging: {
          level: 'info'
        }
      };

      const configPath = path.join(testConfigDir, 'invalid-provider-config.json');
      fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      expect(() => {
        configLoader.loadAgentConfig(configPath);
      }).toThrow('must be equal to one of the allowed values');
    });
  });
});
