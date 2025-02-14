import { IEvent } from '../models/interfaces/event';

export interface IUserPreferences {
  category_interests: Record<string, number>; // categoryId -> interest level (0-3)
  tag_preferences: Record<string, {
    boolean_preference?: boolean;
    categorical_preference?: string;
  }>;
}

export interface IRecommendationScore {
  event_id: string;
  category_score: number;
  tag_score: number;
  total_score: number;
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
}

export interface IRecommendationResult {
  event: IEvent;
  score: IRecommendationScore;
}
