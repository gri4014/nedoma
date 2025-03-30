export interface IUserPreferences {
  categories: Array<{
    id: string;
    interestLevel: 0 | 1 | 2 | 3; // 0 = not interested, 3 = very interested
  }>;
  tags: Array<{
    id: string;
    value: boolean | string[]; // boolean for boolean tags, string[] for categorical tags
  }>;
  city?: string; // For future multi-city support, default to Moscow
}

export interface IRecommendationSettings {
  notificationFrequency: number; // Days per week (1-7)
  notificationTime: string; // HH:mm format
}

export interface IRecommendationScore {
  event_id: string;
  subcategory_id: string;
  tag_match_score: number; // 0-1 score based on matching tags
  has_matching_tags: boolean; // Whether this event has any matching tag preferences
}

export interface IRecommendationResult {
  event: import('./event').IEvent;
  score: IRecommendationScore;
}

export interface IRecommendationResponse {
  success: boolean;
  data: IRecommendationResult[];
  hasMore: boolean;
  error?: string;
}
