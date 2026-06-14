import { SessionManager } from '../../src/core/session-manager';
import { Session, Message } from '../../src/types';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager({
      maxHistoryLength: 100,
      sessionTTL: 3600 // 1 hour
    });
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const sessionId = 'test-session-1';
      const session = sessionManager.createSession(sessionId);

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    it('should create session with auto-generated ID if not provided', () => {
      const session = sessionManager.createSession();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(0);
    });

    it('should throw error if session already exists', () => {
      const sessionId = 'test-session';
      sessionManager.createSession(sessionId);

      expect(() => {
        sessionManager.createSession(sessionId);
      }).toThrow('Session already exists');
    });
  });

  describe('getSession', () => {
    it('should return existing session', () => {
      const sessionId = 'test-session';
      const created = sessionManager.createSession(sessionId);
      
      const retrieved = sessionManager.getSession(sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(sessionId);
      expect(retrieved.createdAt).toBe(created.createdAt);
    });

    it('should throw error if session does not exist', () => {
      expect(() => {
        sessionManager.getSession('non-existent');
      }).toThrow('Session not found');
    });
  });

  describe('addMessage', () => {
    it('should add message to session', () => {
      const sessionId = 'test-session';
      sessionManager.createSession(sessionId);

      const message: Message = {
        role: 'user',
        content: 'Hello'
      };

      sessionManager.addMessage(sessionId, message);

      const session = sessionManager.getSession(sessionId);
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe('user');
      expect(session.messages[0].content).toBe('Hello');
    });

    it('should update session updatedAt timestamp', () => {
      const sessionId = 'test-session';
      const session = sessionManager.createSession(sessionId);
      const originalUpdatedAt = session.updatedAt;

      // Wait a bit
      return new Promise(resolve => {
        setTimeout(() => {
          const message: Message = {
            role: 'user',
            content: 'Hello'
          };
          sessionManager.addMessage(sessionId, message);

          const updated = sessionManager.getSession(sessionId);
          expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);
          resolve(true);
        }, 10);
      });
    });

    it('should limit history length', () => {
      const sessionId = 'test-session';
      sessionManager.createSession(sessionId);

      // Add more messages than maxHistoryLength
      for (let i = 0; i < 150; i++) {
        const message: Message = {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`
        };
        sessionManager.addMessage(sessionId, message);
      }

      const session = sessionManager.getSession(sessionId);
      expect(session.messages.length).toBeLessThanOrEqual(100);
    });

    it('should throw error if session does not exist', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello'
      };

      expect(() => {
        sessionManager.addMessage('non-existent', message);
      }).toThrow('Session not found');
    });
  });

  describe('clearSession', () => {
    it('should clear session messages', () => {
      const sessionId = 'test-session';
      sessionManager.createSession(sessionId);

      const message: Message = {
        role: 'user',
        content: 'Hello'
      };
      sessionManager.addMessage(sessionId, message);

      sessionManager.clearSession(sessionId);

      const session = sessionManager.getSession(sessionId);
      expect(session.messages).toEqual([]);
    });

    it('should throw error if session does not exist', () => {
      expect(() => {
        sessionManager.clearSession('non-existent');
      }).toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete session', () => {
      const sessionId = 'test-session';
      sessionManager.createSession(sessionId);

      sessionManager.deleteSession(sessionId);

      expect(() => {
        sessionManager.getSession(sessionId);
      }).toThrow('Session not found');
    });

    it('should throw error if session does not exist', () => {
      expect(() => {
        sessionManager.deleteSession('non-existent');
      }).toThrow('Session not found');
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions', () => {
      sessionManager.createSession('session-1');
      sessionManager.createSession('session-2');

      sessionManager.clearAllSessions();

      expect(() => {
        sessionManager.getSession('session-1');
      }).toThrow('Session not found');
      expect(() => {
        sessionManager.getSession('session-2');
      }).toThrow('Session not found');
    });
  });

  describe('getSessionHistory', () => {
    it('should return session messages', () => {
      const sessionId = 'test-session';
      sessionManager.createSession(sessionId);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      for (const msg of messages) {
        sessionManager.addMessage(sessionId, msg);
      }

      const history = sessionManager.getSessionHistory(sessionId);
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Hello');
      expect(history[1].content).toBe('Hi there!');
    });
  });

  describe('session TTL', () => {
    it('should expire old sessions', () => {
      const sessionId = 'test-session';
      const manager = new SessionManager({
        maxHistoryLength: 100,
        sessionTTL: 1 // 1 second
      });

      manager.createSession(sessionId);

      // Wait for TTL to expire
      return new Promise(resolve => {
        setTimeout(() => {
          try {
            expect(() => {
              manager.getSession(sessionId);
            }).toThrow('Session expired');
          } finally {
            manager.destroy();
            resolve(true);
          }
        }, 1100);
      });
    });
  });
});
