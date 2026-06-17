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

// Chat endpoint (legacy)
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

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const body = req.body;
    const { messages, stream, model, tools, ...options } = body;
    
    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'messages is required and must be a non-empty array',
          type: 'invalid_request_error',
          code: 'invalid_messages'
        }
      });
    }
    
    // Get the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      return res.status(400).json({
        error: {
          message: 'No user message found in messages array',
          type: 'invalid_request_error',
          code: 'no_user_message'
        }
      });
    }
    
    // Extract session ID from headers or generate one
    const sessionId = req.headers['x-session-id'] as string || 
                     req.headers['x-session_id'] as string ||
                     `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Log the request
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const requestLogPath = path.join(logDir, `openai-request-${Date.now()}.json`);
    fs.writeFileSync(requestLogPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionId,
      lastUserMessage: lastUserMessage.content,
      fullMessages: messages,
      stream: !!stream,
      model: model || 'default',
      tools: tools || []
    }, null, 2));
    
    console.log('[OpenAI Compatible] Request logged to: ' + requestLogPath);
    
    if (stream) {
      // Streaming response (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        // Call Agent Runtime
        const response = await agent.chat(sessionId, lastUserMessage.content);
        
        // Send SSE chunks
        const chunk = {
          id: 'chatcmpl-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model || 'agent-runtime',
          choices: [{
            index: 0,
            delta: { content: response }
          }]
        };
        
        res.write('data: ' + JSON.stringify(chunk) + '\n\n');
        
        // Send [DONE] marker
        res.write('data: [DONE]\n\n');
        res.end();
        
        // Log the response
        const responseLogPath = path.join(logDir, `openai-response-${Date.now()}.json`);
        fs.writeFileSync(responseLogPath, JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId,
          response,
          streaming: true
        }, null, 2));
        
        console.log('[OpenAI Compatible] Streaming response logged to: ' + responseLogPath);
      } catch (error: any) {
        console.error('[OpenAI Compatible] Streaming error:', error);
        res.write('data: ' + JSON.stringify({ error: error.message }) + '\n\n');
        res.end();
      }
    } else {
      // Non-streaming response
      try {
        const response = await agent.chat(sessionId, lastUserMessage.content);
        
        const openaiResponse = {
          id: 'chatcmpl-' + Date.now(),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: model || 'agent-runtime',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: response
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: -1,
            completion_tokens: -1,
            total_tokens: -1
          }
        };
        
        // Log the response
        const responseLogPath = path.join(logDir, `openai-response-${Date.now()}.json`);
        fs.writeFileSync(responseLogPath, JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId,
          response,
          openaiResponse,
          streaming: false
        }, null, 2));
        
        console.log('[OpenAI Compatible] Non-streaming response logged to: ' + responseLogPath);
        
        res.json(openaiResponse);
      } catch (error: any) {
        console.error('[OpenAI Compatible] Non-streaming error:', error);
        res.status(500).json({
          error: {
            message: error.message || 'Internal server error',
            type: 'internal_error',
            code: 'internal_error'
          }
        });
      }
    }
  } catch (error: any) {
    console.error('[OpenAI Compatible] Request parsing error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error',
        code: 'internal_error'
      }
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
      console.log('Server started on port ' + PORT);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
