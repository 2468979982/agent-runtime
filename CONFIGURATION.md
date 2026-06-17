# Configuration Guide

This document provides detailed information about configuring the Agent Runtime.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables (.env)](#environment-variables)
3. [Agent Configuration (agent-config.json)](#agent-configuration)
4. [baseURL Configuration](#baseurl-configuration)
5. [Tools Configuration (tools-config.json)](#tools-configuration)
6. [Prompt Configuration (prompt-config.json)](#prompt-configuration)
7. [Using fetch() Instead of openai Library](#using-fetch)
8. [Examples](#examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Agent Runtime uses a JSON configuration system with environment variable substitution. Configuration files are located in the `config/` directory.

**Key Files**:
- `.env` - Environment variables (API keys, base URLs)
- `config/agent-config.json` - LLM and session settings
- `config/tools-config.json` - Tool configurations
- `config/prompt-config.json` - System prompts and templates

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your LLM API key | `sk-gw-xxx` |
| `BASE_URL` | LLM API base URL | `https://api.openai.com/v1` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `info` |
| `PORT` | API server port | `3001` |

### Example .env File

```bash
# LLM Configuration
OPENAI_API_KEY=sk-gw-your_key_here
BASE_URL=https://openai.u2o6.com/v1

# Server Configuration
PORT=3001

# Logging
LOG_LEVEL=info
```

---

## Agent Configuration

File: `config/agent-config.json`

### Full Configuration Schema

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

### LLM Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | LLM provider (`openai` or `openai-compatible`) |
| `apiKey` | string | Yes | API key (use `${ENV:VAR}` for environment variable) |
| `baseURL` | string | No | Custom base URL for API calls |
| `model` | string | Yes | Model name (e.g., `gpt-4`, `qwen-plus`) |
| `temperature` | number | No | Sampling temperature (0-2, default: 0.7) |
| `maxTokens` | number | No | Maximum tokens in response (default: 2000) |
| `mock` | boolean | No | Enable mock mode for testing (default: false) |

### Session Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `maxHistoryLength` | number | Maximum number of messages in session history |
| `sessionTTL` | number | Session time-to-live in seconds (0 = never expire) |

---

## baseURL Configuration

The `baseURL` field is **critical** for connecting to LLM APIs, especially OpenAI-compatible services.

### What is baseURL?

The `baseURL` is the base endpoint for the LLM API. It should include the protocol, domain, and API version path.

### Standard OpenAI API

```json
{
  "llm": {
    "baseURL": "https://api.openai.com/v1"
  }
}
```

Or via environment variable:
```bash
BASE_URL=https://api.openai.com/v1
```

### OpenAI-Compatible APIs

For services that provide OpenAI-compatible endpoints:

```json
{
  "llm": {
    "baseURL": "https://openai.u2o6.com/v1"
  }
}
```

### Local LLM Servers

For local LLM servers (e.g., OAI models, llama.cpp):

```json
{
  "llm": {
    "baseURL": "http://localhost:8000/v1"
  }
}
```

### Multiple API Versions

Some services use different API versions:

| Service | baseURL |
|---------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Azure OpenAI | `https://<resource>.openai.azure.com/openai/deployments/<deployment>` |
| LocalAI | `http://localhost:8080/v1` |
| OAI models | `http://localhost:11434/v1` |

### Common Mistakes

❌ **Wrong**: Missing `/v1` path
```json
{
  "baseURL": "https://openai.u2o6.com"
}
```

✅ **Correct**: Include `/v1` path
```json
{
  "baseURL": "https://openai.u2o6.com/v1"
}
```

❌ **Wrong**: Using UI URL instead of API URL
```json
{
  "baseURL": "https://platform.openai.com"
}
```

✅ **Correct**: Use API endpoint
```json
{
  "baseURL": "https://api.openai.com/v1"
}
```

---

## Tools Configuration

File: `config/tools-config.json`

### Configuration Schema

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
      "description": "Perform mathematical calculations",
      "parameters": [
        {
          "name": "expression",
          "type": "string",
          "required": true,
          "description": "Mathematical expression to evaluate"
        }
      ]
    }
  ]
}
```

### MCP Servers

Configure Model Context Protocol (MCP) servers:

```json
{
  "mcpServers": [
    {
      "name": "my-mcp-server",
      "url": "http://localhost:3000",
      "description": "My MCP Server"
    }
  ]
}
```

### Builtin Tools

Define builtin tools that the agent can use:

```json
{
  "builtinTools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a location",
      "parameters": [
        {
          "name": "location",
          "type": "string",
          "required": true,
          "description": "City name or coordinates"
        }
      ]
    }
  ]
}
```

---

## Prompt Configuration

File: `config/prompt-config.json`

### Configuration Schema

```json
{
  "systemPrompt": "You are a helpful AI assistant.",
  "templates": [
    {
      "name": "greeting",
      "template": "Hello! How can I help you today?",
      "variables": []
    },
    {
      "name": "code_review",
      "template": "Please review the following code:\n\n```\n{code}\n```\n\nProvide feedback on:",
      "variables": ["code"]
    }
  ]
}
```

### System Prompt

The `systemPrompt` is sent to the LLM at the beginning of each session:

```json
{
  "systemPrompt": "You are a helpful programming assistant. You help users write code, debug issues, and understand programming concepts."
}
```

### Templates

Templates allow you to define reusable prompt templates:

```json
{
  "templates": [
    {
      "name": "summarize",
      "template": "Please summarize the following text in {count} bullet points:\n\n{text}",
      "variables": ["count", "text"]
    }
  ]
}
```

---

## Using fetch() Instead of openai Library

### Why fetch()?

This project uses native `fetch()` API instead of the `openai` npm package because:

1. **Better compatibility**: Some API gateways block requests from the `openai` package
2. **No dependencies**: Reduces package size and potential security issues
3. **More control**: Direct access to request/response for debugging

### How It Works

The `LLMConnector` class uses `fetch()` to call the LLM API:

```typescript
const response = await fetch(`${this.config.baseURL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this.config.apiKey}`
  },
  body: JSON.stringify(requestBody)
});
```

### Benefits

- ✅ Works with API gateways that block `openai` package
- ✅ Full control over request headers
- ✅ Easier to debug (can log exact request/response)
- ✅ No `openai` package version conflicts

### Type Definitions

The `openai` package is still used for **type definitions** only:

```typescript
import OpenAI from 'openai';
// Used for type annotations, not for API calls
```

---

## Examples

### Example 1: Standard OpenAI API

**.env**:
```bash
OPENAI_API_KEY=sk-xxx
BASE_URL=https://api.openai.com/v1
```

**agent-config.json**:
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
  }
}
```

### Example 2: Custom API Gateway

**.env**:
```bash
OPENAI_API_KEY=sk-gw-xxx
BASE_URL=https://openai.u2o6.com/v1
```

**agent-config.json**:
```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "${ENV:OPENAI_API_KEY}",
    "baseURL": "${ENV:BASE_URL}",
    "model": "qwen-plus",
    "temperature": 0.7,
    "maxTokens": 2000,
    "mock": false
  }
}
```

### Example 3: Local LLM Server

**.env**:
```bash
OPENAI_API_KEY=local-token
BASE_URL=http://localhost:8000/v1
```

**agent-config.json**:
```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "${ENV:OPENAI_API_KEY}",
    "baseURL": "${ENV:BASE_URL}",
    "model": "local-model",
    "temperature": 0.7,
    "maxTokens": 2000,
    "mock": false
  }
}
```

### Example 4: Mock Mode (Testing)

**agent-config.json**:
```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "dummy-key",
    "model": "mock-model",
    "mock": true
  }
}
```

In mock mode, the LLM connector returns predefined responses without making API calls.

---

## Troubleshooting

### Issue: 403 "Your request was blocked"

**Symptoms**:
- API calls return 403 error
- Message: "Your request was blocked"

**Causes**:
1. Incorrect API key
2. API gateway blocking `openai` package User-Agent
3. Incorrect `baseURL`

**Solutions**:
1. Verify `OPENAI_API_KEY` in `.env` is correct
2. Ensure `BASE_URL` is correct (including `/v1` path)
3. Test API directly with `curl` or `fetch()`
4. Check debug logs in `logs/llm-connector-debug-*.json`

**Debug Steps**:
```bash
# Test API directly
curl -X POST https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}'
```

### Issue: model Field Shows "default"

**Symptoms**:
- Requests show `"model": "default"` instead of configured model
- API returns 400 error (unknown model)

**Causes**:
1. `config-loader.ts` not reading `model` field correctly
2. Configuration file has wrong format

**Solutions**:
1. Check `agent-config.json` has correct `model` field
2. Add debug logging to `LLMConnector` constructor
3. Verify `config-loader.ts` validation schema includes `model`

### Issue: fetch() Failed

**Symptoms**:
- Error: "fetch failed"
- Network-related errors

**Causes**:
1. Incorrect `baseURL`
2. Network connectivity issues
3. API endpoint not accessible

**Solutions**:
1. Verify `baseURL` in `.env`
2. Test connectivity: `ping your-gateway.com`
3. Check firewall/proxy settings
4. Verify API endpoint supports OpenAI-compatible format

### Issue: TypeScript Compilation Error (Cannot find namespace 'OpenAI')

**Symptoms**:
- Error: `TS2503: Cannot find namespace 'OpenAI'`

**Causes**:
1. `openai` package not installed
2. Type definitions missing

**Solutions**:
1. Install `openai` package: `npm install openai @types/node`
2. If you don't need type definitions, remove `import OpenAI from 'openai'`
3. Use `any` type instead of OpenAI types

---

## FAQ

### Q: Can I use Azure OpenAI?

Yes, but you need to adjust the `baseURL` and authentication:

```json
{
  "llm": {
    "baseURL": "https://<resource>.openai.azure.com/openai/deployments/<deployment>",
    "apiKey": "${ENV:AZURE_OPENAI_KEY}"
  }
}
```

### Q: How do I use multiple LLM providers?

Currently, Agent Runtime supports one LLM provider at a time. To switch providers, update `agent-config.json`.

### Q: Can I use mock mode for development?

Yes! Set `"mock": true` in `agent-config.json`. The LLM connector will return mock responses without making API calls.

### Q: How do I debug LLM API calls?

Check the debug logs in `logs/llm-connector-debug-*.json`. These logs contain:
- Request URL, headers, and body
- Response status and data
- Error details

---

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [OpenAI-Compatible APIs](https://github.com/openai/openai-openapi)
- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol)

---

**Last Updated**: 2026-06-18
