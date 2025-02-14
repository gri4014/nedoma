import { BaseEntity, DataType } from './common';

/**
 * Enum for table status
 */
export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  INACTIVE = 'inactive'
}

/**
 * Interface for restaurant tables
 */
export interface ITable extends BaseEntity {
  restaurant_id: string;
  table_number: number | null;
  status: TableStatus;
  qr_code_identifier: string;
  qr_code_image_path: string | null;
}

/**
 * Interface for menu item categories
 */
export interface ICategory extends BaseEntity {
  restaurant_id: string;
  name: string;
  display_order: number;
}

/**
 * Interface for menu item parameters
 */
export interface IItemParameter extends BaseEntity {
  name: string;
  data_type: DataType;
  min_value?: number | null;
  max_value?: number | null;
}

/**
 * Interface for parameter validation rules
 */
export interface IParameterValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
}

/**
 * Interface for parameter configuration
 */
export interface IParameterConfig {
  parameter_id: string;
  validation: IParameterValidation;
}

/**
 * Type for parameter values in menu items
 */
export type ParameterValue = boolean | number | string;

/**
 * Interface for storing parameter values
 */
export interface IParameterValues {
  [parameter_id: string]: ParameterValue;
}
