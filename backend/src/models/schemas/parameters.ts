import { z } from 'zod';
import { DataType } from '../interfaces/common';

/**
 * Schema for data type validation
 */
export const dataTypeSchema = z.nativeEnum(DataType);

/**
 * Schema for item parameter validation
 */
const itemParameterBase = {
  name: z.string().min(1).max(100),
  data_type: dataTypeSchema,
  min_value: z.number().nullable().optional(),
  max_value: z.number().nullable().optional()
};

export const itemParameterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  data_type: dataTypeSchema,
  min_value: z.number().nullable().optional(),
  max_value: z.number().nullable().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()).optional(),
  is_active: z.boolean().default(true)
}).refine(
  data => {
    if (data.min_value !== undefined && data.min_value !== null && 
        data.max_value !== undefined && data.max_value !== null) {
      return data.min_value <= data.max_value;
    }
    return true;
  },
  {
    message: "min_value must be less than or equal to max_value"
  }
);

export const createItemParameterSchema = z.object(itemParameterBase).extend({
  is_active: z.boolean().default(true)
});

export const updateItemParameterSchema = createItemParameterSchema.partial();

/**
 * Schema for parameter validation rules
 */
export const parameterValidationSchema = z.object({
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(z.string()).optional()
});

/**
 * Schema for parameter configuration
 */
export const parameterConfigSchema = z.object({
  parameter_id: z.string().uuid(),
  validation: parameterValidationSchema
});

/**
 * Schema for parameter values
 */
export const parameterValueSchema = z.union([
  // Boolean
  z.boolean(),
  z.string().transform(val => val === 'true'),
  // Number (Integer or Float)
  z.number(),
  z.string().transform(val => {
    const num = Number(val);
    if (!isNaN(num)) {
      // Always convert to number if it's a valid number string
      return num;
    }
    return val;
  }),
  // String
  z.string()
]);

/**
 * Schema for parameter values object
 */
export const parameterValuesSchema = z.preprocess(
  (obj) => {
    if (typeof obj === 'string') {
      try {
        return JSON.parse(obj);
      } catch {
        return obj;
      }
    }
    return obj;
  },
  z.record(z.string().uuid(), parameterValueSchema)
);

/**
 * Schema for bulk parameter operations
 */
export const bulkParameterOperationSchema = z.object({
  parameters: z.array(createItemParameterSchema)
});

/**
 * Schema for parameter filters
 */
export const parameterFiltersSchema = z.object({
  data_type: dataTypeSchema.optional(),
  search: z.string().optional(),
  has_validation: z.boolean().optional()
});

/**
 * Schema for parameter assignment
 */
export const parameterAssignmentSchema = z.object({
  parameter_id: z.string().uuid(),
  required: z.boolean().default(false),
  validation: parameterValidationSchema.optional()
});

/**
 * Schema for parameter group
 */
export const parameterGroupSchema = z.object({
  name: z.string().min(1).max(100),
  parameters: z.array(parameterAssignmentSchema)
});
