# 配置指南

本文档提供关于配置 Agent Runtime 的详细信息。

## 目录

1. [概述](#概述)
2. [环境变量 (.env)](#环境变量)
3. [Agent 配置 (agent-config.json)](#agent-配置)
4. [baseURL 配置](#baseurl-配置)
5. [工具配置 (tools-config.json)](#工具-配置)
6. [提示配置 (prompt-config.json)](#提示-配置)
7. [使用 fetch() 代替 openai 库](#使用-fetch)
8. [示例](#示例)
9. [故障排查](#故障-排查)

---

## 概述

Agent Runtime 使用带有环境变量替换的 JSON 配置系统。配置文件位于 `config/` 目录中。

**关键文件**：
- `.env` - 环境变量（API keys、base URLs）
- `config/agent-config.json` - LLM 和会话设置
- `config/tools-config.json` - 工具配置
- `config/prompt-config.json` - 系统提示和模板

---

## 环境变量

在项目根目录创建 `.env` 文件（从 `.env.example` 复制）：

```bash
cp .env.example .env
```

### 必需变量

| 变量 | 描述 | 示例 |
|----------|-------------|---------|
| `OPENAI_API_KEY` | 你的 LLM API key | `sk-gw-xxx` |
| `BASE_URL` | LLM API 基础 URL | `https://api.openai.com/v1` |

### 可选变量

| 变量 | 描述 | 默认 |
|----------|-------------|---------|
| `LOG_LEVEL` | 日志级别 | `info` |
| `PORT` | API 服务器端口 | `3001` |

### .env 文件示例

```bash
# LLM 配置
OPENAI_API_KEY=sk-gw-your_key_here
BASE_URL=https://openai.u2o6.com/v1

# 服务器配置
PORT=3001

# 日志
LOG_LEVEL=info
```

---

## Agent 配置

文件：`config/agent-config.json`

### 完整配置 Schema

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

### LLM 配置字段

| 字段 | 类型 | 必需 | 描述 |
|-------|------|----------|-------------|
| `provider` | string | 是 | LLM 提供商（`openai` 或 `openai-compatible`） |
| `apiKey` | string | 是 | API key（使用 `${ENV:VAR}` 引用环境变量） |
| `baseURL` | string | 否 | API 调用的自定义基础 URL |
| `model` | string | 是 | 模型名称（例如 `gpt-4`、`qwen-plus`） |
| `temperature` | number | 否 | 采样温度 (0-2，默认：0.7) |
| `maxTokens` | number | 否 | 响应中的最大 token 数（默认：2000） |
| `mock` | boolean | 否 | 启用 mock 模式进行测试（默认：false） |

### 会话配置字段

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `maxHistoryLength` | number | 会话历史记录中的最大消息数 |
| `sessionTTL` | number | 会话生存时间（秒）（0 = 永不过期） |

---

## baseURL 配置

`baseURL` 字段对于连接到 LLM API **至关重要**，尤其是 OpenAI 兼容的服务。

### 什么是 baseURL？

`baseURL` 是 LLM API 的基础端点。它应该包含协议、域名和 API 版本路径。

### 标准 OpenAI API

```json
{
  "llm": {
    "baseURL": "https://api.openai.com/v1"
  }
}
```

或通过环境变量：
```bash
BASE_URL=https://api.openai.com/v1
```

### OpenAI 兼容的 API

对于提供 OpenAI 兼容端点的服务：

```json
{
  "llm": {
    "baseURL": "https://openai.u2o6.com/v1"
  }
}
```

### 本地 LLM 服务器

对于本地 LLM 服务器（例如 Ollama、llama.cpp）：

```json
{
  "llm": {
    "baseURL": "http://localhost:8000/v1"
  }
}
```

### 多个 API 版本

某些服务使用不同的 API 版本：

| 服务 | baseURL |
|---------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Azure OpenAI | `https://<resource>.openai.azure.com/openai/deployments/<deployment>` |
| LocalAI | `http://localhost:8080/v1` |
| Ollama | `http://localhost:11434/v1` |

### 常见错误

❌ **错误**：缺少 `/v1` 路径
```json
{
  "baseURL": "https://openai.u2o6.com"
}
```

✅ **正确**：包含 `/v1` 路径
```json
{
  "baseURL": "https://openai.u2o6.com/v1"
}
```

❌ **错误**：使用 UI URL 而不是 API URL
```json
{
  "baseURL": "https://platform.openai.com"
}
```

✅ **正确**：使用 API 端点
```json
{
  "baseURL": "https://api.openai.com/v1"
}
```

---

## 工具配置

文件：`config/tools-config.json`

### 配置 Schema

```json
{
  "mcpServers": [
    {
      "name": "example-mcp-server",
      "url": "http://localhost:3000",
      "description": "示例 MCP 服务器"
    }
  ],
  "builtinTools": [
    {
      "name": "calculator",
      "description": "执行数学计算",
      "parameters": [
        {
          "name": "expression",
          "type": "string",
          "required": true,
          "description": "数学表达式"
        }
      ]
    }
  ]
}
```

### MCP 服务器

配置模型上下文协议 (MCP) 服务器：

```json
{
  "mcpServers": [
    {
      "name": "my-mcp-server",
      "url": "http://localhost:3000",
      "description": "我的 MCP 服务器"
    }
  ]
}
```

### 内置工具

定义 agent 可以使用的内置工具：

```json
{
  "builtinTools": [
    {
      "name": "get_weather",
      "description": "获取某个位置的当前天气",
      "parameters": [
        {
          "name": "location",
          "type": "string",
          "required": true,
          "description": "城市名称或坐标"
        }
      ]
    }
  ]
}
```

---

## 提示配置

文件：`config/prompt-config.json`

### 配置 Schema

```json
{
  "systemPrompt": "你是一个有用的 AI 助手。",
  "templates": [
    {
      "name": "greeting",
      "template": "你好！今天我可以帮助你什么？",
      "variables": []
    },
    {
      "name": "code_review",
      "template": "请审查以下代码：\n\n```\n{code}\n```\n\n提供反馈：",
      "variables": ["code"]
    }
  ]
}
```

### 系统提示

`systemPrompt` 在每次会话开始时发送给 LLM：

```json
{
  "systemPrompt": "你是一个有用的编程助手。你帮助用户编写代码、调试问题和理解编程概念。"
}
```

### 模板

模板允许你定义可重用的提示模板：

```json
{
  "templates": [
    {
      "name": "summarize",
      "template": "请用 {count} 个要点总结以下文本：\n\n{text}",
      "variables": ["count", "text"]
    }
  ]
}
```

---

## 使用 fetch() 代替 openai 库

### 为什么使用 fetch()？

本项目使用原生 `fetch()` API 代替 `openai` npm 包，因为：

1. **更好的兼容性**：某些 API 网关会阻止来自 `openai` 包的请求
2. **无依赖**：减少包大小和潜在的安全问题
3. **更多控制**：直接访问请求/响应以进行调试

### 如何工作

`LLMConnector` 类使用 `fetch()` 调用 LLM API：

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

### 好处

- ✅ 可与阻止 `openai` 包的 API 网关一起工作
- ✅ 完全控制请求 headers
- ✅ 更容易调试（可以记录确切的请求/响应）
- ✅ 无 `openai` 包版本冲突

### 类型定义

`openai` 包仍仅用于**类型定义**：

```typescript
import OpenAI from 'openai';
// 用于类型注解，不用于 API 调用
```

---

## 示例

### 示例 1：标准 OpenAI API

**.env**：
```bash
OPENAI_API_KEY=sk-xxx
BASE_URL=https://api.openai.com/v1
```

**agent-config.json**：
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

### 示例 2：自定义 API 网关

**.env**：
```bash
OPENAI_API_KEY=sk-gw-xxx
BASE_URL=https://openai.u2o6.com/v1
```

**agent-config.json**：
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

### 示例 3：本地 LLM 服务器

**.env**：
```bash
OPENAI_API_KEY=local-token
BASE_URL=http://localhost:8000/v1
```

**agent-config.json**：
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

### 示例 4：Mock 模式（测试）

**agent-config.json**：
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

在 mock 模式下，LLM 连接器返回预定义的响应，而无需进行 API 调用。

---

## 故障排查

### 问题：403 "Your request was blocked"

**症状**：
- API 调用返回 403 错误
- 消息："Your request was blocked"

**原因**：
1. API key 不正确
2. API 网关阻止了 `openai` 包的 User-Agent
3. `baseURL` 不正确

**解决方案**：
1. 验证 `.env` 中的 `OPENAI_API_KEY` 是否正确
2. 确保 `BASE_URL` 正确（包含 `/v1` 路径）
3. 使用 `curl` 或 `fetch()` 直接测试 API
4. 检查 `logs/llm-connector-debug-*.json` 中的调试日志

**调试步骤**：
```bash
# 直接测试 API
curl -X POST https://your-gateway.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}'
```

### 问题：model 字段显示为 "default"

**症状**：
- 请求显示 `"model": "default"` 而不是配置的模型
- API 返回 400 错误（未知模型）

**原因**：
1. `config-loader.ts` 未正确读取 `model` 字段
2. 配置文件格式错误

**解决方案**：
1. 检查 `agent-config.json` 是否具有正确的 `model` 字段
2. 在 `LLMConnector` 构造函数中添加调试日志
3. 验证 `config-loader.ts` 验证 schema 包含 `model`

### 问题：fetch() 失败

**症状**：
- 错误："fetch failed"
- 网络相关错误

**原因**：
1. `baseURL` 不正确
2. 网络连接问题
3. API 端点不可访问

**解决方案**：
1. 验证 `.env` 中的 `baseURL`
2. 测试连接性：`ping your-gateway.com`
3. 检查防火墙/代理设置
4. 验证 API 端点是否支持 OpenAI 兼容格式

### 问题：TypeScript 编译错误（Cannot find namespace 'OpenAI'）

**症状**：
- 错误：`TS2503: Cannot find namespace 'OpenAI'`

**原因**：
1. 未安装 `openai` 包
2. 缺少类型定义

**解决方案**：
1. 安装 `openai` 包：`npm install openai @types/node`
2. 如果不需要类型定义，可以移除 `import OpenAI from 'openai'`
3. 使用 `any` 类型代替 OpenAI 类型

---

## 常见问题

### 问：我可以使用 Azure OpenAI 吗？

可以，但你需要调整 `baseURL` 和身份验证：

```json
{
  "llm": {
    "baseURL": "https://<resource>.openai.azure.com/openai/deployments/<deployment>",
    "apiKey": "${ENV:AZURE_OPENAI_KEY}"
  }
}
```

### 问：我如何使用多个 LLM 提供商？

目前，Agent Runtime 一次只支持一个 LLM 提供商。要切换提供商，请更新 `agent-config.json`。

### 问：我可以使用 mock 模式进行开发吗？

可以！在 `agent-config.json` 中设置 `"mock": true`。LLM 连接器将返回 mock 响应，而无需进行 API 调用。

### 问：如何调试 LLM API 调用？

查看 `logs/llm-connector-debug-*.json` 中的调试日志。这些日志包含：
- 请求 URL、headers 和 body
- 响应状态和数据
- 错误详情

---

## 参考

- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [OpenAI 兼容 API](https://github.com/openai/openai-openapi)
- [模型上下文协议 (MCP)](https://github.com/modelcontextprotocol)

---

**最后更新**：2026-06-18
