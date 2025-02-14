import { Pool, QueryResult, PoolClient } from 'pg';
import { z } from 'zod';
import pool from '../../config/database';
import { DbResponse } from '../interfaces/database';
import { DbError, ErrorType } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Base model class providing common CRUD operations
 */
export abstract class BaseModel<T extends { id: string }, V extends keyof T = never> {
  protected abstract tableName: string;
  protected abstract schema: z.ZodObject<any>;
  protected virtualFields: V[] = [];
  public db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Create a new record using a specific database client (for transactions)
   */
  async createWithClient(
    client: PoolClient,
    data: Omit<T, 'id' | 'created_at' | 'updated_at' | V>
  ): Promise<DbResponse<T>> {
    try {
      // Create a schema without virtual fields for validation
      const validationSchema = this.schema.omit({
        id: true,
        created_at: true,
        updated_at: true,
        ...Object.fromEntries(this.virtualFields.map(field => [field, true]))
      });

      // Validate data against schema
      const validationResult = validationSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error(`Validation failed for ${this.tableName}:`, {
          errors: validationResult.error.errors,
          data
        });
        return {
          success: false,
          error: new DbError(
            ErrorType.VALIDATION,
            'Validation failed',
            validationResult.error
          )
        };
      }

      // Remove virtual fields from data
      const dataToInsert = {
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: 'is_active' in data ? data.is_active : true
      };

      const keys = Object.keys(dataToInsert);
      const values = Object.values(dataToInsert);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;

      logger.info(`Creating ${this.tableName} with data:`, data);
      const result: QueryResult = await client.query(query, values);

      if (!result.rows[0]) {
        return {
          success: false,
          error: new DbError(
            ErrorType.DATABASE,
            `Failed to create ${this.tableName}: No data returned`
          )
        };
      }

      return {
        success: true,
        data: result.rows[0] as T
      };
    } catch (error) {
      logger.error(`Error creating ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to create ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at' | V>): Promise<DbResponse<T>> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await this.createWithClient(client, data);
      if (!result.success) {
        await client.query('ROLLBACK');
        return result;
      }
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error in create transaction for ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.TRANSACTION,
          `Transaction failed for ${this.tableName} creation`,
          error
        )
      };
    } finally {
      client.release();
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<DbResponse<T>> {
    try {
      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result: QueryResult = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Record not found'
          )
        };
      }

      return {
        success: true,
        data: result.rows[0] as T
      };
    } catch (error) {
      logger.error(`Error finding ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to find ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Update a record
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | V>>): Promise<DbResponse<T>> {
    try {
      // Create a schema without virtual fields for validation
      const validationSchema = this.schema.partial().omit({
        id: true,
        created_at: true,
        updated_at: true,
        ...Object.fromEntries(this.virtualFields.map(field => [field, true]))
      });

      // Validate data against schema
      const validationResult = validationSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error(`Validation failed for ${this.tableName}:`, {
          errors: validationResult.error.errors,
          data
        });
        return {
          success: false,
          error: new DbError(
            ErrorType.VALIDATION,
            'Validation failed',
            validationResult.error
          )
        };
      }

      // Remove virtual fields from data
      const dataToUpdate = { ...data };

      const keys = Object.keys(dataToUpdate);
      if (keys.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.VALIDATION,
            'No fields to update'
          )
        };
      }

      const setClause = keys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${keys.length + 1}
        RETURNING *
      `;

      const values = [...Object.values(dataToUpdate), id];
      const result: QueryResult = await this.db.query(query, values);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Record not found'
          )
        };
      }

      return {
        success: true,
        data: result.rows[0] as T
      };
    } catch (error) {
      logger.error(`Error updating ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to update ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<DbResponse<void>> {
    try {
      logger.info(`[BaseModel] Attempting to delete record with id ${id} from ${this.tableName}`);
      
      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
        RETURNING id
      `;

      logger.info(`[BaseModel] Executing query: ${query} with id: ${id}`);
      const result: QueryResult = await this.db.query(query, [id]);
      logger.info(`[BaseModel] Query result:`, result);

      if (result.rows.length === 0) {
        logger.error(`[BaseModel] Record not found for deletion: ${id}`);
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Record not found'
          )
        };
      }

      logger.info(`[BaseModel] Successfully deleted record ${id}`);
      return {
        success: true
      };
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to delete ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Find all records with optional filters
   */
  async findAll(filters: Partial<Omit<T, V>> = {}): Promise<DbResponse<T[]>> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Remove virtual fields from filters
      const filtersToUse = { ...filters };
      for (const field of this.virtualFields) {
        delete (filtersToUse as any)[field];
      }

      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const query = `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const result: QueryResult = await this.db.query(query, values);

      return {
        success: true,
        data: result.rows as T[]
      };
    } catch (error) {
      logger.error(`Error finding ${this.tableName} records:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to find ${this.tableName} records`,
          error
        )
      };
    }
  }

  /**
   * Find one record with filters
   */
  async findOne(filters: Partial<Omit<T, V>>): Promise<DbResponse<T>> {
    try {
      const result = await this.findAll(filters);
      
      if (!result.success || !result.data || result.data.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Record not found'
          )
        };
      }

      return {
        success: true,
        data: result.data[0]
      };
    } catch (error) {
      logger.error(`Error finding ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to find ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Update a record with a transaction client
   */
  async updateWithClient(
    client: PoolClient,
    id: string,
    data: Partial<Omit<T, 'id' | 'created_at' | V>>
  ): Promise<DbResponse<T>> {
    try {
      // Create a schema without virtual fields for validation
      const validationSchema = this.schema.partial().omit({
        id: true,
        created_at: true,
        updated_at: true,
        ...Object.fromEntries(this.virtualFields.map(field => [field, true]))
      });

      // Validate data against schema
      const validationResult = validationSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error(`Validation failed for ${this.tableName}:`, {
          errors: validationResult.error.errors,
          data
        });
        return {
          success: false,
          error: new DbError(
            ErrorType.VALIDATION,
            'Validation failed',
            validationResult.error
          )
        };
      }

      // Remove virtual fields from data
      const dataToUpdate = { ...data };

      const keys = Object.keys(dataToUpdate);
      if (keys.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.VALIDATION,
            'No fields to update'
          )
        };
      }

      const setClause = keys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${keys.length + 1}
        RETURNING *
      `;

      const values = [...Object.values(dataToUpdate), id];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Record not found'
          )
        };
      }

      return {
        success: true,
        data: result.rows[0] as T
      };
    } catch (error) {
      logger.error(`Error updating ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to update ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Delete a record with a transaction client
   */
  async deleteWithClient(
    client: PoolClient,
    id: string
  ): Promise<DbResponse<void>> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
        RETURNING id
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Record not found'
          )
        };
      }

      return {
        success: true
      };
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}:`, error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          `Failed to delete ${this.tableName}`,
          error
        )
      };
    }
  }

  /**
   * Begin a database transaction
   */
  protected async beginTransaction() {
    const client = await this.db.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a database transaction
   */
  protected async commitTransaction(client: any) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback a database transaction
   */
  protected async rollbackTransaction(client: any) {
    await client.query('ROLLBACK');
    client.release();
  }
}
