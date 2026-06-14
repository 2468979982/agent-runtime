import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import { AgentConfig, ToolsConfig, PromptConfig } from '../types';

export class ConfigLoader {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Load and parse agent configuration file
   */
  loadAgentConfig(configPath: string): AgentConfig {
    const config = this.loadAndParseConfig(configPath);
    
    // Substitute environment variables
    const substitutedConfig = this.substituteEnvVariables(config);
    
    // Validate configuration
    this.validateAgentConfig(substitutedConfig);
    
    return substitutedConfig as AgentConfig;
  }

  /**
   * Load and parse tools configuration file
   */
  loadToolsConfig(configPath: string): ToolsConfig {
    const config = this.loadAndParseConfig(configPath);
    
    // Substitute environment variables
    const substitutedConfig = this.substituteEnvVariables(config);
    
    // Validate configuration
    this.validateToolsConfig(substitutedConfig);
    
    return substitutedConfig as ToolsConfig;
  }

  /**
   * Load and parse prompt configuration file
   */
  loadPromptConfig(configPath: string): PromptConfig {
    const config = this.loadAndParseConfig(configPath);
    
    // Substitute environment variables
    const substitutedConfig = this.substituteEnvVariables(config);
    
    // Validate configuration
    this.validatePromptConfig(substitutedConfig);
    
    return substitutedConfig as PromptConfig;
  }

  /**
   * Load config file and parse JSON
   */
  private loadAndParseConfig(configPath: string): any {
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      throw new Error('Config file not found');
    }

    // Read and parse JSON
    let fileContent: string;
    try {
      fileContent = fs.readFileSync(configPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read config file: ${error}`);
    }

    let config: any;
    try {
      config = JSON.parse(fileContent);
    } catch (error) {
      throw new Error('Invalid JSON in config file');
    }

    return config;
  }

  /**
   * Substitute environment variables in config
   * Syntax: ${ENV:VAR_NAME}
   */
  private substituteEnvVariables(obj: any): any {
    if (typeof obj === 'string') {
      return this.substituteStringEnvVars(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteEnvVariables(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.substituteEnvVariables(obj[key]);
      }
      return result;
    }

    return obj;
  }

  /**
   * Substitute environment variables in a string
   */
  private substituteStringEnvVars(str: string): string {
    return str.replace(/\$\{ENV:([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not defined`);
      }
      return value;
    });
  }

  /**
   * Validate agent configuration
   */
  private validateAgentConfig(config: any): void {
    const schema = {
      type: 'object',
      required: ['llm', 'session', 'logging'],
      properties: {
        llm: {
          type: 'object',
          required: ['provider', 'apiKey', 'model'],
          properties: {
            provider: { type: 'string', enum: ['openai', 'openai-compatible'] },
            apiKey: { type: 'string' },
            baseURL: { type: 'string' },
            model: { type: 'string' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number', minimum: 1 }
          }
        },
        session: {
          type: 'object',
          required: ['maxHistoryLength'],
          properties: {
            maxHistoryLength: { type: 'number', minimum: 1 },
            sessionTTL: { type: 'number', minimum: 0 }
          }
        },
        logging: {
          type: 'object',
          required: ['level'],
          properties: {
            level: { type: 'string', enum: ['error', 'warn', 'info', 'debug'] },
            file: { type: 'string' }
          }
        }
      }
    };

    const validate = this.ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
      throw new Error(`Config validation failed: ${errors}`);
    }

    // Additional validation for LLM provider
    const llmConfig = (config as any).llm;
    if (llmConfig && !['openai', 'openai-compatible'].includes(llmConfig.provider)) {
      throw new Error('Invalid LLM provider');
    }
  }

  /**
   * Validate tools configuration
   */
  private validateToolsConfig(config: any): void {
    const schema = {
      type: 'object',
      required: ['mcpServers', 'builtinTools'],
      properties: {
        mcpServers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'url'],
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              description: { type: 'string' }
            }
          }
        },
        builtinTools: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'description', 'parameters'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              parameters: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'type', 'required'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
                    required: { type: 'boolean' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    };

    const validate = this.ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
      throw new Error(`Tools config validation failed: ${errors}`);
    }
  }

  /**
   * Validate prompt configuration
   */
  private validatePromptConfig(config: any): void {
    const schema = {
      type: 'object',
      required: ['systemPrompt'],
      properties: {
        systemPrompt: { type: 'string' },
        templates: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'template'],
            properties: {
              name: { type: 'string' },
              template: { type: 'string' },
              variables: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    };

    const validate = this.ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
      throw new Error(`Prompt config validation failed: ${errors}`);
    }
  }
}
