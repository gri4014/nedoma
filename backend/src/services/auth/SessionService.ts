import { Session, SessionCreateParams, SessionValidationResult } from '../../types/session';
import { jwtService } from './JWTService';
import { SessionModel } from '../../models/entities/SessionModel';

/**
 * Service for managing authentication sessions
 */
export class SessionService {
  /**
   * Create a new session for a user
   */
  public async createSession(params: SessionCreateParams): Promise<Session> {
    // Create session
    return SessionModel.create(params);
  }

  /**
   * Get a session by ID
   */
  public async getSession(sessionId: string): Promise<Session | null> {
    return SessionModel.getById(sessionId);
  }

  /**
   * Update the last activity timestamp of a session
   */
  public async updateSessionActivity(sessionId: string): Promise<boolean> {
    return SessionModel.updateActivity(sessionId);
  }

  /**
   * Validate a session and its associated token
   */
  public async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = await SessionModel.getById(sessionId);
    
    if (!session) {
      return {
        valid: false,
        error: 'Session not found'
      };
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      return {
        valid: false,
        error: 'Session expired'
      };
    }

    // Validate the JWT token
    const tokenValidation = jwtService.validateToken(session.token);
    if (!tokenValidation.valid) {
      return {
        valid: false,
        error: 'Invalid session token'
      };
    }

    return {
      valid: true,
      session
    };
  }

  /**
   * Remove a session
   */
  public async removeSession(sessionId: string): Promise<boolean> {
    return SessionModel.remove(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  public async getUserSessions(userId: string): Promise<Session[]> {
    return SessionModel.getByUserId(userId);
  }

  /**
   * Remove all sessions for a user
   */
  public async removeUserSessions(userId: string): Promise<number> {
    return SessionModel.removeByUserId(userId);
  }
}

// Export singleton instance
export const sessionService = new SessionService();
