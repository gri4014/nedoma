import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { Session, SessionCreateParams } from '../../types/session';
import { jwtService } from '../../services/auth/JWTService';

export class SessionModel {
  /**
   * Create a new session
   */
  static async create(params: SessionCreateParams): Promise<Session> {
    const { userId, role, entity } = params;
    const id = uuidv4();
    // Generate JWT token with expiration
    const token = jwtService.generateToken({
      id: userId,
      role,
      entity
    });

    // Decode token to get expiration time
    const decoded = jwtService.decodeToken(token);
    if (!decoded.exp) {
      throw new Error('Token does not contain expiration time');
    }
    const expiresAt = new Date(decoded.exp * 1000); // Convert Unix timestamp to Date

    const result = await db.query(
      `INSERT INTO sessions (id, user_id, role, entity, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, role, entity, token, expiresAt]
    );

    return this.mapDBSessionToSession(result.rows[0]);
  }

  /**
   * Get a session by ID
   */
  static async getById(id: string): Promise<Session | null> {
    const result = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP',
      [id]
    );

    return result.rows[0] ? this.mapDBSessionToSession(result.rows[0]) : null;
  }

  /**
   * Update session last activity
   */
  static async updateActivity(id: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE sessions 
       SET last_activity = CURRENT_TIMESTAMP 
       WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP
       RETURNING id`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get all active sessions for a user
   */
  static async getByUserId(userId: string): Promise<Session[]> {
    const result = await db.query(
      'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP',
      [userId]
    );

    return result.rows.map(this.mapDBSessionToSession);
  }

  /**
   * Remove a session
   */
  static async remove(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM sessions WHERE id = $1 RETURNING id',
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Remove all sessions for a user
   */
  static async removeByUserId(userId: string): Promise<number> {
    const result = await db.query(
      'DELETE FROM sessions WHERE user_id = $1 RETURNING id',
      [userId]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Map database session record to Session type
   */
  private static mapDBSessionToSession(dbSession: any): Session {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      role: dbSession.role,
      entity: dbSession.entity,
      token: dbSession.token,
      createdAt: dbSession.created_at,
      lastActivity: dbSession.last_activity,
      expiresAt: dbSession.expires_at
    };
  }
}
