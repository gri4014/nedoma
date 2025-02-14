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

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at?: Date;
  is_active: boolean;
}

export interface QueryFilters {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
  is_active?: boolean;
}
