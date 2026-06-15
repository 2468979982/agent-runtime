import { Hono } from 'hono';
import { AgentRuntime } from '../index';
import { defaultLogger } from './utils/logger';

// Environment variables interface
interface Env {
  OPENAI_API_KEY: string;
  BASE_URL?: string;
  LOG_LEVEL?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Initialize Agent Runtime (cached per Worker instance)
let agent: AgentRuntime | null = null;
let initialized = false;

async function initializeAgent(env: Env) {
  if (initialized) return;

  const logger = defaultLogger;
  agent = new AgentRuntime(logger);
  
  // Create temp config files from env vars
  const agentConfig = {
    llm: {
      provider: 'openai-compatible',
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.BASE_URL || 'https://api.openai.com/v1',
      model: 'qwen-plus',
      temperature: 0.7,
      maxTokens: 2000,
      mock: false // Set to true for testing
    },
    session: {
      maxHistoryLength: 100,
      sessionTTL: 3600
    },
    logging: {
      level: env.LOG_LEVEL || 'info'
    }
  };

  // Write config to a temporary location (Workers don't have filesystem)
  // For now, we'll pass config directly to AgentRuntime
  // This requires modifying AgentRuntime to accept config objects directly
  
  // TODO: Modify AgentRuntime.initialize() to accept config objects
  // For now, we'll use environment variables
  
  await agent.initialize(
    './config/agent-config.json',
    './config/tools-config.json',
    './config/prompt-config.json'
  );
  
  initialized = true;
  logger.info('Agent Runtime initialized for Cloudflare Worker');
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'cloudflare-worker'
  });
});

// API info endpoint
app.get('/api', (c) => {
  return c.json({
    name: 'Agent Runtime API',
    version: '1.0.0',
    runtime: 'cloudflare-worker',
    endpoints: [
      'POST /api/chat',
      'GET /api/sessions',
      'GET /api/sessions/:sessionId/history',
      'POST /api/config/reload'
    ]
  });
});

// Chat endpoint
app.post('/api/chat', async (c) => {
  try {
    const env = c.env;
    await initializeAgent(env);

    const body = await c.req.json();
    const { message, sessionId } = body;

    if (!message || !sessionId) {
      return c.json({
        error: 'Missing required fields: sessionId and message'
      }, 400);
    }

    logger.info('Processing chat request for session:', sessionId);

    const response = await agent!.chat(sessionId, message);

    return c.json({
      sessionId,
      response: response.content,
      toolCalls: response.toolCalls || [],
      usage: response.usage || null
    });

  } catch (error: any) {
    logger.error('Chat request failed:', error);
    return c.json({
      error: error.message || 'Internal server error'
    }, 500);
  }
});

// Get all sessions
app.get('/api/sessions', (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }

  const sessions = agent.getSessions();
  return c.json({ sessions });
});

// Get session history
app.get('/api/sessions/:sessionId/history', (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }

  const sessionId = c.req.param('sessionId');
  
  try {
    const history = agent.getSessionHistory(sessionId);
    return c.json({ sessionId, history });
  } catch (error: any) {
    return c.json({
      error: error.message || 'Session not found'
    }, 404);
  }
});

// Reload configuration
app.post('/api/config/reload', async (c) => {
  try {
    if (agent) {
      await agent.reloadConfig();
      return c.json({ message: 'Configuration reloaded successfully' });
    } else {
      return c.json({ error: 'Agent not initialized' }, 500);
    }
  } catch (error: any) {
    return c.json({
      error: error.message || 'Failed to reload configuration'
    }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

export default app;
