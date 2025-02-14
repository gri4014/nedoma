export interface Tag {
  id: string;
  name: string;
  possible_values: string[];
  subcategories?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// For backwards compatibility
export type ITag = Tag;

export interface TagPreference {
  tagId: string;
  selected_values: string[];
}

export interface TagWithPreference extends Tag {
  selected_values?: string[];
}

export interface CreateTagInput {
  name: string;
  possible_values: string[];
  subcategories: string[];
  is_active?: boolean;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {}

export interface SetTagPreferencesRequest {
  preferences: TagPreference[];
}

export interface GetTagPreferencesResponse {
  preferences: TagPreference[];
}

export interface ApiTagResponse {
  data: Tag[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
