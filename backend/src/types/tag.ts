export interface ITag {
  id: string;
  name: string;
  possible_values: string[];
  subcategories: string[]; // Array of subcategory IDs (now required)
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTagInput {
  name: string;
  possible_values: string[];
  subcategories: string[]; // Array of subcategory IDs
  is_active?: boolean;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {}

export interface TagWithEventCount extends ITag {
  event_count: number;
}

export interface TagWithStats extends ITag {
  total_events: number;
  active_events: number;
  last_used_at: Date | null;
}

export interface TagWithSelectedValues extends ITag {
  selected_values: string[];
}
