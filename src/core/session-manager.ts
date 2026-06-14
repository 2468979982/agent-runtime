import { Session, Message, SessionConfig } from '../types';
import { Logger } from '../utils/logger';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private config: SessionConfig;
  private logger: Logger;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: SessionConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger();

    // Start TTL cleanup if configured
    if (config.sessionTTL && config.sessionTTL > 0) {
      this.startCleanup();
    }
  }

  /**
   * Create a new session
   */
  createSession(sessionId?: string): Session {
    const id = sessionId || this.generateSessionId();

    if (this.sessions.has(id)) {
      throw new Error('Session already exists');
    }

    const session: Session = {
      id,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(id, session);
    this.logger.info(`Session created: ${id}`);

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): Session {
    this.checkSessionExists(sessionId);
    this.checkSessionTTL(sessionId);

    const session = this.sessions.get(sessionId)!;
    return { ...session, messages: [...session.messages] }; // Return copy
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: Message): void {
    this.checkSessionExists(sessionId);
    this.checkSessionTTL(sessionId);

    const session = this.sessions.get(sessionId)!;
    session.messages.push(message);
    session.updatedAt = Date.now();

    // Limit history length
    if (session.messages.length > this.config.maxHistoryLength) {
      const excess = session.messages.length - this.config.maxHistoryLength;
      session.messages = session.messages.slice(excess);
      this.logger.debug(`Trimmed ${excess} messages from session ${sessionId}`);
    }

    this.logger.debug(`Message added to session ${sessionId}`, {
      role: message.role,
      messageCount: session.messages.length
    });
  }

  /**
   * Clear session messages
   */
  clearSession(sessionId: string): void {
    this.checkSessionExists(sessionId);
    this.checkSessionTTL(sessionId);

    const session = this.sessions.get(sessionId)!;
    session.messages = [];
    session.updatedAt = Date.now();

    this.logger.info(`Session cleared: ${sessionId}`);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.checkSessionExists(sessionId);

    this.sessions.delete(sessionId);
    this.logger.info(`Session deleted: ${sessionId}`);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    this.logger.info(`All sessions cleared (${count} sessions)`);
  }

  /**
   * Get session message history
   */
  getSessionHistory(sessionId: string): Message[] {
    this.checkSessionExists(sessionId);
    this.checkSessionTTL(sessionId);

    const session = this.sessions.get(sessionId)!;
    return [...session.messages]; // Return copy
  }

  /**
   * Get all session IDs
   */
  getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if session exists
   */
  private checkSessionExists(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      throw new Error('Session not found');
    }
  }

  /**
   * Check session TTL and expire if needed
   */
  private checkSessionTTL(sessionId: string): void {
    if (!this.config.sessionTTL || this.config.sessionTTL <= 0) {
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const now = Date.now();
    const age = (now - session.updatedAt) / 1000; // seconds

    if (age > this.config.sessionTTL) {
      this.sessions.delete(sessionId);
      this.logger.info(`Session expired: ${sessionId} (age: ${age}s)`);
      throw new Error('Session expired');
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start TTL cleanup interval
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);

    this.logger.info('Session TTL cleanup started');
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    if (!this.config.sessionTTL || this.config.sessionTTL <= 0) {
      return;
    }

    const now = Date.now();
    let expiredCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = (now - session.updatedAt) / 1000; // seconds

      if (age > this.config.sessionTTL) {
        this.sessions.delete(sessionId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.info(`Cleaned up ${expiredCount} expired sessions`);
    }
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      this.logger.info('Session TTL cleanup stopped');
    }
  }

  /**
   * Destroy - cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clearAllSessions();
    this.logger.info('SessionManager destroyed');
  }
}
