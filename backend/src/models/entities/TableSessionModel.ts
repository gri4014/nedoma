import { BaseModel } from '../base/BaseModel';
import { ITableSession, SessionStatus, ICreateTableSession, IUpdateTableSession, ISessionDetails } from '../interfaces/session';
import { tableSessionSchema, sessionDetailsSchema } from '../schemas/session';
import { DbResponse } from '../interfaces/database';
import { TableModel } from './TableModel';
import { TableStatus } from '../interfaces/system';
import pool from '../../config/database';

/**
 * Model for managing table sessions
 */
export class TableSessionModel extends BaseModel<ITableSession> {
  protected tableName = 'active_sessions';
  protected schema = tableSessionSchema;
  private tableModel: TableModel;

  constructor() {
    super();
    this.tableModel = new TableModel();
  }

  /**
   * Start a new table session
   */
  async startSession(data: ICreateTableSession): Promise<DbResponse<ITableSession>> {
    try {
      // Check if table exists and is available
      const table = await this.tableModel.findById(data.table_id);
      if (!table.success || !table.data) {
        return {
          success: false,
          error: 'Table not found'
        };
      }

      if (table.data.status !== 'available') {
        return {
          success: false,
          error: 'Table is not available'
        };
      }

      // Check for existing active session
      const existingSession = await this.findOne({
        table_id: data.table_id,
        status: SessionStatus.ACTIVE
      });

      if (existingSession.success && existingSession.data) {
        return {
          success: false,
          error: 'Table already has an active session'
        };
      }

      // Create new session
      const session = await this.create({
        ...data,
        status: SessionStatus.ACTIVE,
        is_active: true
      });

      if (session.success && session.data) {
        // Update table status to occupied
        await this.tableModel.updateStatus(data.table_id, TableStatus.OCCUPIED);
      }

      return session;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start session'
      };
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    data: IUpdateTableSession
  ): Promise<DbResponse<ITableSession>> {
    try {
      const session = await this.findById(sessionId);
      if (!session.success || !session.data) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      // If completing or expiring session, update table status
      if (data.status === SessionStatus.COMPLETED || data.status === SessionStatus.EXPIRED) {
        await this.tableModel.updateStatus(session.data.table_id, TableStatus.AVAILABLE);
      }

      return await this.update(sessionId, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session status'
      };
    }
  }

  /**
   * Close session (staff only)
   */
  async closeSession(sessionId: string, staffId: string): Promise<DbResponse<ITableSession>> {
    return this.updateSessionStatus(sessionId, {
      status: SessionStatus.COMPLETED,
      closed_by: staffId
    });
  }

  /**
   * Get active session for table
   */
  async getActiveSession(tableId: string): Promise<DbResponse<ITableSession>> {
    return this.findOne({
      table_id: tableId,
      status: SessionStatus.ACTIVE
    });
  }

  /**
   * Validate session access
   */
  async validateSessionAccess(
    sessionId: string,
    deviceId: string
  ): Promise<DbResponse<ITableSession>> {
    try {
      const session = await this.findById(sessionId);
      if (!session.success || !session.data) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      if (session.data.status !== SessionStatus.ACTIVE) {
        return {
          success: false,
          error: 'Session is not active'
        };
      }

      if (session.data.device_id !== deviceId) {
        return {
          success: false,
          error: 'Invalid device for this session'
        };
      }

      return {
        success: true,
        data: session.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate session access'
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<DbResponse<void>> {
    try {
      const now = new Date();
      const expiredSessions = await this.db.query(
        `SELECT * FROM ${this.tableName} 
         WHERE status = $1 
         AND expires_at <= $2 
         AND is_active = true`,
        [SessionStatus.ACTIVE, now]
      );

      if (!expiredSessions.rows || expiredSessions.rows.length === 0) {
        return {
          success: false,
          error: 'Failed to find expired sessions'
        };
      }

      for (const session of expiredSessions.rows) {
        await this.updateSessionStatus(session.id, {
          status: SessionStatus.EXPIRED
        });
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup expired sessions'
      };
    }
  }

  /**
   * Get detailed session information including orders and waiter calls
   */
  async getSessionDetails(sessionId: string): Promise<DbResponse<ISessionDetails>> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get session with table information
      const sessionResult = await client.query(
        `SELECT 
          s.*,
          t.number as table_number
        FROM ${this.tableName} s
        JOIN tables t ON s.table_id = t.id
        WHERE s.id = $1 AND s.is_active = true`,
        [sessionId]
      );

      if (!sessionResult.rows[0]) {
        throw new Error('Session not found');
      }

      const session = sessionResult.rows[0];

      // Get orders for the session
      const ordersResult = await client.query(
        `SELECT 
          o.id,
          o.status,
          o.total_amount,
          o.created_at,
          json_agg(
            json_build_object(
              'name', mi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'special_requests', oi.special_requests,
              'status', o.status
            )
          ) as items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN menu_items mi ON oi.item_id = mi.id
        WHERE o.table_id = $1 
        AND o.is_active = true
        AND o.created_at >= $2
        GROUP BY o.id, o.status, o.total_amount, o.created_at
        ORDER BY o.created_at DESC`,
        [session.table_id, session.created_at]
      );

      // Get active waiter calls for the session
      const waiterCallsResult = await client.query(
        `SELECT 
          id,
          status,
          created_at
        FROM waiter_calls
        WHERE table_id = $1
        AND created_at >= $2
        ORDER BY created_at DESC`,
        [session.table_id, session.created_at]
      );

      // Calculate total amount spent in session
      const totalSessionAmount = ordersResult.rows.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      );

      const sessionDetails: ISessionDetails = {
        session: {
          id: session.id,
          table_id: session.table_id,
          table_number: session.table_number,
          device_id: session.device_id,
          phone_number: session.phone_number,
          current_preferences: session.current_preferences,
          status: session.status,
          created_at: session.created_at,
          orders: ordersResult.rows,
          waiter_calls: waiterCallsResult.rows,
          total_session_amount: totalSessionAmount
        }
      };

      // Validate response format
      const validationResult = sessionDetailsSchema.safeParse(sessionDetails);
      if (!validationResult.success) {
        throw new Error('Invalid session details format');
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: sessionDetails
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session details'
      };
    } finally {
      client.release();
    }
  }
}

export const tableSessionModel = new TableSessionModel();
