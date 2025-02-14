export interface TagPreference {
  tagId: string;
  value: boolean | string; // boolean for BOOLEAN type, string for CATEGORICAL
}

export interface TagPreferenceResponse {
  success: boolean;
  data?: TagPreference[];
  error?: string;
}
