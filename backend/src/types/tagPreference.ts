import { DbResponse } from '../models/interfaces/database';

export interface TagPreference {
  tagId: string;
  value: string; // Only string values for categorical tags
}

export interface TagPreferenceRecord {
  id: string;
  user_id: string;
  tag_id: string;
  value: string;
  created_at: Date;
  updated_at: Date;
  possible_values?: string[];
}

export type TagPreferenceResponse = DbResponse<TagPreference[]>;
