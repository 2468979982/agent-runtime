# Agent Runtime

一个可移植的、基于 JSON 配置的 Agent 运行时，在服务器端运行。只需连接到 LLM 即可开始使用！

## 特性

- **服务器端执行**：运行在 Node.js 20+ 上
- **可移植**：JSON 配置，无环境特定代码
- **LLM 兼容**：支持 OpenAI 和 OpenAI 兼容的 API
- **原生 fetch() 实现**：使用原生 `fetch()` API 代替 `openai` npm 包，提供更好的兼容性
- **MCP 集成**：内置 MCP 客户端，可连接到 MCP 服务器
- **工具支持**：内置工具和 MCP 工具
- **会话管理**：支持多轮对话和历史记录管理
- **配置验证**：使用 Ajv 进行 JSON Schema 验证
- **环境变量替换**：在配置文件中使用 `${ENV:VAR_NAME}`

## 安装

```bash
npm install
```

## 快速开始

1. 复制 `.env.example` 到 `.env` 并配置你的 LLM API：

```bash
cp .env.example .env
# 编辑 .env 并设置：
#   OPENAI_API_KEY=你的_api_key
#   BASE_URL=https://api.openai.com/v1   # 或你的自定义端点
```

**重要提示**：本项目使用原生 `fetch()` API 代替 `openai` npm 包，以兼容各种 API 网关。

2. 查看 `config/` 目录中的配置文件：
   - `agent-config.json` - LLM 和会话设置
   - `tools-config.json` - 工具配置
   - `prompt-config.json` - 系统提示和模板

3. 运行示例：

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

## 配置

### Agent 配置 (agent-config.json)

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

**关键配置字段**：

- `apiKey`：使用 `${ENV:OPENAI_API_KEY}` 从环境变量读取
- `baseURL`：使用 `${ENV:BASE_URL}` 从环境变量读取（可选，默认为 `https://api.openai.com/v1`）
- `mock`：设置为 `true` 用于测试（无需 API 调用）

**环境变量替换**：使用 `${ENV:VAR_NAME}` 来替换环境变量。

### 工具配置 (tools-config.json)

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

### 提示配置 (prompt-config.json)

```json
{
  "systemPrompt": "你是一个有用的 AI 助手。",
  "templates": [
    {
      "name": "greeting",
      "template": "你好！我可以帮助你什么？",
      "variables": []
    }
  ]
}
```

## API 文档

### AgentRuntime 类

#### 构造函数

```typescript
const agent = new AgentRuntime(logger?: Logger);
```

#### 方法

##### initialize(agentConfigPath, toolsConfigPath, promptConfigPath): Promise<void>

使用配置文件初始化 agent 运行时。

##### chat(sessionId, userMessage): Promise<string>

发送消息并获取响应。支持多轮对话。

```typescript
const response = await agent.chat('session-1', '今天天气怎么样？');
```

##### getSessionHistory(sessionId): Message[]

获取会话的对话历史记录。

##### clearSession(sessionId): void

清除会话的消息历史记录。

##### deleteSession(sessionId): void

完全删除会话。

##### destroy(): void

清理资源（在关闭时调用）。

## 架构

```
agent-runtime/
├── index.ts                    // 主入口
├── config/                     // 配置文件
├── src/
│   ├── core/
│   │   ├── llm-connector.ts  // LLM API 连接器
│   │   ├── tool-manager.ts    // 工具执行
│   │   ├── session-manager.ts // 会话管理
│   │   ├── mcp-client.ts     // MCP 客户端
│   │   └── config-loader.ts  // 配置加载器
│   ├── tools/builtin/        // 内置工具
│   ├── types/                // TypeScript 类型
│   └── utils/               // 工具函数
├── tests/                     // 测试
└── README.md
```

## 测试

运行所有测试：

```bash
npm test
```

运行测试并生成覆盖率报告：

```bash
npm run test:coverage
```

在监视模式下运行测试：

```bash
npm run test:watch
```

## 构建

将 TypeScript 编译为 JavaScript：

```bash
npm run build
```

编译后的文件将在 `dist/` 目录中。

## 部署

1. 构建项目：`npm run build`
2. 将 `dist/`、`config/` 和 `.env` 复制到你的服务器
3. 运行：`node dist/index.js`

## 示例

### 使用 OpenAI 兼容的 API

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

**注意**：`baseURL` 应该包含完整的路径，直到 `/v1`（或你的端点使用的 API 版本）。

### 使用自定义 API 网关（例如 OpenAI 兼容服务）

如果你使用的是会阻止 `openai` npm 包的自定义 API 网关，本项目的原生 `fetch()` 实现可以正常工作：

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

在您的 `.env` 文件中：
```
OPENAI_API_KEY=你的实际_api_key
BASE_URL=https://your-gateway.com/v1
```

## 故障排查

### 403 "Your request was blocked" 错误

如果你在调用 LLM API 时遇到 403 错误：

1. **检查你的 API key**：确保 `.env` 中的 `OPENAI_API_KEY` 是正确的
2. **验证 baseURL**：确保 `BASE_URL` 指向正确的端点
3. **使用 curl/fetch 测试**：直接测试你的 API 以确保它能正常工作：
   ```bash
   curl -X POST https://your-gateway.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_api_key" \
     -d '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}'
   ```
4. **检查 API 网关限制**：某些 API 网关会阻止来自特定 User-Agent（如 `openai` npm 包）的请求。本项目使用原生 `fetch()` 来避免这个问题。
5. **查看调试日志**：检查 `logs/llm-connector-debug-*.json` 文件中的详细请求/响应信息

### model 字段显示为 "default" 而不是配置的模型

如果 model 字段被覆盖为 "default"：

1. 检查 `agent-config.json` 是否具有正确的 `model` 字段
2. 确保 `config-loader.ts` 正确读取配置
3. 在 `LLMConnector` 构造函数中添加调试日志以验证 `this.config.model`

### TypeScript 编译错误

如果你看到诸如 `Cannot find namespace 'OpenAI'` 的错误：

1. 确保已安装 `openai` 包：`npm install openai`
2. `openai` 包仅用于类型定义，不用于 API 调用
3. 如果你不需要类型定义，可以移除 `import OpenAI from 'openai'` 并相应地调整类型

### 调试日志

要启用调试日志：

1. 查看 `logs/llm-connector-debug-*.json` 文件中的详细请求/响应信息
2. 这些日志显示了发送到 LLM API 的确切 URL、headers 和 body
3. 有助于诊断 403 错误和配置错误
4. 日志写入到 `logs/` 目录，文件名包含时间戳

### fetch() 失败错误

如果你看到 "fetch failed" 错误：

1. 检查 `.env` 中的 `baseURL` 是否配置正确
2. 确保 URL 可从你的服务器访问
3. 检查网络/代理问题
4. 验证 API 端点是否支持 OpenAI 兼容格式

## 许可证

ISC

## 贡献

欢迎提交 Pull Request！请在提交前运行测试。

## 支持

如有问题和疑问，请在 GitHub 上打开 issue。

---

## 为什么使用 fetch() 代替 openai 库？

### 问题

在调试过程中，我们发现：
1. **`openai` npm 包被 API 网关阻止**（返回 403 "Your request was blocked"）
2. **原生 `fetch()` 可以成功调用相同的 API**
3. **可能的原因**：API 网关检查了 User-Agent 或其他 HTTP 头

### 解决方案

本项目使用原生 `fetch()` API 代替 `openai` npm 包，因为：

1. **更好的兼容性**：某些 API 网关会阻止来自 `openai` 包的请求
2. **无额外依赖**：减少包大小和潜在的安全问题
3. **更多控制权**：直接访问请求/响应以进行调试

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
// 仅用于类型注解，不用于 API 调用
```
