import { BaseModel } from '../base/BaseModel';
import { IItemParameter, DbResponse } from '../interfaces';
import { DataType } from '../interfaces/common';

import { createItemParameterSchema } from '../schemas/parameters';

export class ItemParameterModel extends BaseModel<IItemParameter> {
  protected tableName = 'item_parameters';
  protected schema = createItemParameterSchema;

  /**
   * Find parameters by data type
   */
  async findByDataType(dataType: DataType): Promise<DbResponse<IItemParameter[]>> {
    return await this.findAll({ data_type: dataType, is_active: true });
  }

  /**
   * Find parameters by name pattern
   */
  async searchByName(pattern: string): Promise<DbResponse<IItemParameter[]>> {
    try {
      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE name ILIKE $1 AND is_active = true
        ORDER BY name ASC
      `;

      const result = await this.db.query(query, [`%${pattern}%`]);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Bulk create parameters
   */
  async bulkCreate(parameters: Array<Omit<IItemParameter, 'id' | 'created_at' | 'updated_at'>>): Promise<DbResponse<IItemParameter[]>> {
    const client = await this.beginTransaction();
    try {
      const createdParameters: IItemParameter[] = [];

      for (const parameter of parameters) {
        const result = await this.create(parameter);
        if (!result.success) {
          throw new Error(`Failed to create parameter: ${result.error}`);
        }
        if (result.data) {
          createdParameters.push(result.data);
        }
      }

      await this.commitTransaction(client);
      return {
        success: true,
        data: createdParameters
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update parameter validation rules
   */
  async updateValidation(
    id: string,
    minValue?: number,
    maxValue?: number
  ): Promise<DbResponse<IItemParameter>> {
    const updates: Partial<IItemParameter> = {};
    
    if (minValue !== undefined) {
      updates.min_value = minValue;
    }
    
    if (maxValue !== undefined) {
      updates.max_value = maxValue;
    }

    return await this.update(id, updates);
  }

  /**
   * Get parameters usage statistics
   */
  async getUsageStatistics(): Promise<DbResponse<Array<{
    parameter_id: string;
    name: string;
    data_type: DataType;
    usage_count: number;
  }>>> {
    try {
      const query = `
        SELECT 
          p.id as parameter_id,
          p.name,
          p.data_type,
          COUNT(DISTINCT mi.id) as usage_count
        FROM ${this.tableName} p
        LEFT JOIN menu_items mi ON mi.parameters ? p.id::text
        WHERE p.is_active = true
        GROUP BY p.id
        ORDER BY usage_count DESC, p.name ASC
      `;

      const result = await this.db.query(query);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get parameters with their validation rules
   */
  async getWithValidation(): Promise<DbResponse<Array<IItemParameter & {
    has_validation: boolean;
  }>>> {
    try {
      const query = `
        SELECT *,
          CASE 
            WHEN min_value IS NOT NULL OR max_value IS NOT NULL THEN true
            ELSE false
          END as has_validation
        FROM ${this.tableName}
        WHERE is_active = true
        ORDER BY name ASC
      `;

      const result = await this.db.query(query);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate parameter value against its rules
   */
  async validateValue(
    parameterId: string,
    value: any
  ): Promise<DbResponse<{ isValid: boolean; error?: string }>> {
    try {
      const parameterResult = await this.findById(parameterId);
      if (!parameterResult.success || !parameterResult.data) {
        return {
          success: false,
          error: 'Parameter not found'
        };
      }

      const parameter = parameterResult.data;
      let isValid = true;
      let error: string | undefined;

      switch (parameter.data_type) {
        case 'integer':
        case 'float':
        case 'scale': {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            isValid = false;
            error = 'Invalid number format';
            break;
          }

          const minValue = parameter.min_value;
          if (minValue !== undefined && minValue !== null && numValue < minValue) {
            isValid = false;
            error = `Value must be greater than or equal to ${minValue}`;
            break;
          }

          const maxValue = parameter.max_value;
          if (maxValue !== undefined && maxValue !== null && numValue > maxValue) {
            isValid = false;
            error = `Value must be less than or equal to ${maxValue}`;
            break;
          }

          if (parameter.data_type === 'integer' && !Number.isInteger(numValue)) {
            isValid = false;
            error = 'Value must be an integer';
          }
          break;
        }

        case 'boolean':
          if (typeof value !== 'boolean') {
            isValid = false;
            error = 'Value must be a boolean';
          }
          break;

        case 'text':
          if (typeof value !== 'string') {
            isValid = false;
            error = 'Value must be a string';
          }
          break;
      }

      return {
        success: true,
        data: { isValid, error }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
