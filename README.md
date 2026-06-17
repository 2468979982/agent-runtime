# Agent Runtime

A portable, JSON configuration-driven Agent runtime that runs on the server side. Just connect to an LLM and you're ready to go!

## Features

- **Server-side execution**: Runs on Node.js 20+
- **Portable**: JSON configuration, no environment-specific code
- **LLM compatible**: Supports OpenAI and OpenAI-compatible APIs
- **Native fetch() implementation**: Uses native `fetch()` API instead of `openai` npm package for better compatibility
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

1. Copy `.env.example` to `.env` and configure your LLM API:

```bash
cp .env.example .env
# Edit .env and set:
#   OPENAI_API_KEY=your_api_key_here
#   BASE_URL=https://api.openai.com/v1   # or your custom endpoint
```

**Important**: This project uses native `fetch()` API instead of the `openai` npm package for better compatibility with various API gateways.

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
    "baseURL": "${ENV:BASE_URL}",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000,
    "mock": false
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

**Key Configuration Fields**:

- `apiKey`: Use `${ENV:OPENAI_API_KEY}` to read from environment variable
- `baseURL`: Use `${ENV:BASE_URL}` to read from environment variable (optional, defaults to `https://api.openai.com/v1`)
- `mock`: Set to `true` for testing without API calls

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
    "provider": "openai",
    "apiKey": "${ENV:LOCAL_API_KEY}",
    "baseURL": "http://localhost:8000/v1",
    "model": "local-model",
    "mock": false
  }
}
```

**Note**: The `baseURL` should include the full path up to `/v1` (or whichever API version your endpoint uses).

### Using Custom API Gateway (e.g., OpenAI-compatible services)

If you're using a custom API gateway that blocks the `openai` npm package, this project's native `fetch()` implementation will work:

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "${ENV:CUSTOM_API_KEY}",
    "baseURL": "https://your-gateway.com/v1",
    "model": "your-model-name",
    "mock": false
  }
}
```

And in your `.env` file:
```
OPENAI_API_KEY=your_actual_api_key
BASE_URL=https://your-gateway.com/v1
```

### Multi-turn Conversation

```typescript
await agent.chat('session-1', 'My name is Alice');
await agent.chat('session-1', 'What is my name?'); // Remembers "Alice"
```

### Tool Usage

The agent automatically uses tools when needed. Just configure them in `tools-config.json`.

## Troubleshooting

### 403 "Your request was blocked" Error

If you get a 403 error when calling the LLM API:

1. **Check your API key**: Ensure `OPENAI_API_KEY` in `.env` is correct and not a placeholder
2. **Verify baseURL**: Ensure `BASE_URL` points to the correct endpoint (including `/v1` path)
3. **Test with curl/fetch**: Test your API directly to ensure it's working:
   ```bash
   curl -X POST https://your-gateway.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_api_key" \
     -d '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}'
   ```
4. **API gateway restrictions**: Some API gateways block requests from certain User-Agents (like the `openai` npm package). This project uses native `fetch()` to avoid this issue.
5. **Check debug logs**: Review `logs/llm-connector-debug-*.json` files for detailed request/response information

### Model Field Shows "default" Instead of Configured Model

If the model field is being overridden to "default":

1. Check `agent-config.json` has the correct `model` field
2. Ensure `config-loader.ts` is properly reading the configuration
3. Add debug logging to `LLMConnector` constructor to verify `this.config.model`

### TypeScript Compilation Errors

If you see errors like `Cannot find namespace 'OpenAI'`:

1. Ensure `openai` package is installed: `npm install openai`
2. The `openai` package is used only for type definitions, not for API calls
3. If you don't want type definitions, remove `import OpenAI from 'openai'` and adjust types accordingly

### Debug Logging

To enable debug logging:

1. Check `logs/llm-connector-debug-*.json` files for detailed request/response information
2. These logs show the exact URL, headers, and body being sent to the LLM API
3. Useful for diagnosing 403 errors and incorrect configurations
4. Logs are written to `logs/` directory with timestamp in filename

### fetch() Failed Error

If you see "fetch failed" error:

1. Check that `baseURL` is correctly configured in `.env`
2. Ensure the URL is accessible from your server
3. Check for network/proxy issues
4. Verify the API endpoint supports the OpenAI-compatible format

## License

ISC

## Contributing

Pull requests welcome! Please run tests before submitting.

## Support

For issues and questions, please open an issue on GitHub.
