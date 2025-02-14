export enum DataType {
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  FLOAT = 'float',
  SCALE = 'scale',
  TEXT = 'text'
}

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  [DataType.BOOLEAN]: 'Boolean',
  [DataType.INTEGER]: 'Integer',
  [DataType.FLOAT]: 'Float',
  [DataType.SCALE]: 'Scale',
  [DataType.TEXT]: 'Text'
};

export interface Parameter {
  id: string;
  name: string;
  data_type: DataType;
  min_value?: number | null;
  max_value?: number | null;
  created_at: string | Date;
  updated_at?: string | Date;
  is_active: boolean;
}

export interface CreateParameterPayload {
  name: string;
  data_type: DataType;
  min_value?: number | null;
  max_value?: number | null;
  is_active?: boolean;
}

export interface UpdateParameterPayload extends Partial<CreateParameterPayload> {}

export interface ParameterValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
}

export interface ParameterConfig {
  parameter_id: string;
  validation: ParameterValidation;
}

export type ParameterValue = boolean | number | string;

export interface ParameterValues {
  [parameter_id: string]: ParameterValue;
}

export interface ParameterResponse {
  success: boolean;
  data?: Parameter;
  error?: string;
  message?: string;
}

export interface ParametersResponse {
  success: boolean;
  data?: Parameter[];
  error?: string;
  message?: string;
}
