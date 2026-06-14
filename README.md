# Agent Runtime

A portable, JSON configuration-driven Agent runtime that runs on the server side. Just connect to an LLM and you're ready to go!

## Features

- **Server-side execution**: Runs on Node.js 20+
- **Portable**: JSON configuration, no environment-specific code
- **LLM compatible**: Supports OpenAI and OpenAI-compatible APIs
- **MCP integration**: Built-in MCP client for connecting to MCP servers
- **Tool support**: Builtin tools and MCP tools
- **Session management**: Multi-turn conversations with history management
- **Configuration validation**: JSON Schema validation with Ajv
- **Environment variable substitution**: Use `${ENV:VAR_NAME}` in config files

## Installation

```bash
npm install
```

## Quick Start

1. Copy `.env.example` to `.env` and set your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
```

2. Review the configuration files in `config/` directory:
   - `agent-config.json` - LLM and session settings
   - `tools-config.json` - Tool configurations
   - `prompt-config.json` - System prompts and templates

3. Run the example:

```typescript
import { AgentRuntime } from './index';

async function main() {
  const agent = new AgentRuntime();
  
  await agent.initialize(
    'config/agent-config.json',
    'config/tools-config.json',
    'config/prompt-config.json'
  );
  
  const response = await agent.chat('session-1', 'Hello!');
  console.log(response);
}

main();
```

## Configuration

### Agent Config (agent-config.json)

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "${ENV:OPENAI_API_KEY}",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000
  },
  "session": {
    "maxHistoryLength": 100,
    "sessionTTL": 3600
  },
  "logging": {
    "level": "info",
    "file": "logs/agent.log"
  }
}
```

**Environment Variable Substitution**: Use `${ENV:VAR_NAME}` to substitute environment variables.

### Tools Config (tools-config.json)

```json
{
  "mcpServers": [
    {
      "name": "example-mcp-server",
      "url": "http://localhost:3000",
      "description": "Example MCP Server"
    }
  ],
  "builtinTools": [
    {
      "name": "calculator",
      "description": "Perform calculations",
      "parameters": [
        {
          "name": "expression",
          "type": "string",
          "required": true,
          "description": "Math expression"
        }
      ]
    }
  ]
}
```

### Prompt Config (prompt-config.json)

```json
{
  "systemPrompt": "You are a helpful AI assistant.",
  "templates": [
    {
      "name": "greeting",
      "template": "Hello! How can I help?",
      "variables": []
    }
  ]
}
```

## API Documentation

### AgentRuntime Class

#### Constructor

```typescript
const agent = new AgentRuntime(logger?: Logger);
```

#### Methods

##### initialize(agentConfigPath, toolsConfigPath, promptConfigPath): Promise<void>

Initialize the agent runtime with configuration files.

##### chat(sessionId, userMessage): Promise<string>

Send a message and get the response. Handles multi-turn conversations.

```typescript
const response = await agent.chat('session-1', 'What is the weather?');
```

##### getSessionHistory(sessionId): Message[]

Get the conversation history for a session.

##### clearSession(sessionId): void

Clear the message history for a session.

##### deleteSession(sessionId): void

Delete a session entirely.

##### destroy(): void

Cleanup resources (call on shutdown).

## Architecture

```
agent-runtime/
├── index.ts                    // Main entry
├── config/                     // Configuration files
├── src/
│   ├── core/
│   │   ├── llm-connector.ts  // LLM API connector
│   │   ├── tool-manager.ts    // Tool execution
│   │   ├── session-manager.ts // Session management
│   │   ├── mcp-client.ts     // MCP client
│   │   └── config-loader.ts  // Config loader
│   ├── tools/builtin/        // Builtin tools
│   ├── types/                // TypeScript types
│   └── utils/               // Utilities
├── tests/                     // Tests
└── README.md
```

## Testing

Run all tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

The compiled files will be in the `dist/` directory.

## Deployment

1. Build the project: `npm run build`
2. Copy `dist/`, `config/`, and `.env` to your server
3. Run: `node dist/index.js`

## Examples

### Using with OpenAI-compatible API

```json
{
  "llm": {
    "provider": "openai-compatible",
    "apiKey": "${ENV:LOCAL_API_KEY}",
    "baseURL": "http://localhost:8000",
    "model": "local-model"
  }
}
```

### Multi-turn Conversation

```typescript
await agent.chat('session-1', 'My name is Alice');
await agent.chat('session-1', 'What is my name?'); // Remembers "Alice"
```

### Tool Usage

The agent automatically uses tools when needed. Just configure them in `tools-config.json`.

## License

ISC

## Contributing

Pull requests welcome! Please run tests before submitting.

## Support

For issues and questions, please open an issue on GitHub.
