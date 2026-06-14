require('dotenv').config();

import express from 'express';
import cors from 'cors';
import { AgentRuntime } from './index';
import { defaultLogger } from './src/utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Agent Runtime
let agent: AgentRuntime;

async function initializeAgent() {
  const logger = defaultLogger;
  agent = new AgentRuntime(logger);
  await agent.initialize(
    './config/agent-config.json',
    './config/tools-config.json',
    './config/prompt-config.json'
  );
  logger.info('Agent Runtime initialized for API server');
}

// API Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId and message'
      });
    }

    const response = await agent.chat(sessionId, message);
    res.json({ response });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  try {
    // Note: This would need to be implemented in SessionManager
    // For now, return empty array
    res.json({ sessions: [] });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Clear session
app.delete('/api/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    agent.clearSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Get session history
app.get('/api/sessions/:sessionId/history', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = agent.getSessionHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  try {
    await initializeAgent();

    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Agent Runtime API server listening on <INTERNAL_HOST_REMOVED>`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
