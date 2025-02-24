import { IEvent } from '../models/interfaces/event';

export interface IUserPreferences {
  category_interests: Record<string, number>; // categoryId -> interest level (0-3)
  tag_preferences: Record<string, {
    boolean_preference?: boolean;
    categorical_preference?: string[]; // Changed to string[] to support multiple selected values
  }>;
}

export interface IRecommendationScore {
  event_id: string;
  subcategory_id: string;
  tag_match_score: number; // 0-1 score based on matching tags
  has_matching_tags: boolean; // Whether this event has any matching tag preferences
}

export interface IRecommendationSettings {
  category_weight: number;
  tag_weight: number;
  min_category_interest: number;
  max_events: number;
}

export interface IRecommendationFilters {
  startDate?: Date;
  endDate?: Date;
  isFree?: boolean;
  maxPrice?: number;
  excludeEventIds?: string[];
  offset?: number;
  limit?: number;
}

export interface IRecommendationResult {
  event: IEvent;
  score: IRecommendationScore;
}
