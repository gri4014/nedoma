export interface IUserPreferences {
  categories: Array<{
    id: string;
    interestLevel: 0 | 1 | 2 | 3; // 0 = not interested, 3 = very interested
  }>;
  tags: Array<{
    id: string;
    value: boolean | string; // boolean for boolean tags, string for categorical tags
  }>;
  city?: string; // For future multi-city support, default to Moscow
}

export interface IRecommendationSettings {
  notificationFrequency: number; // Days per week (1-7)
  notificationTime: string; // HH:mm format
}

export interface IRecommendationScore {
  eventId: string;
  score: number;
  factors: {
    categoryInterest: number; // 0-1 based on category interest level
    tagMatches: number; // 0-1 based on matching tag preferences
    swipeHistory: number; // 0-1 based on similar events' swipe history
  };
}

export interface IRecommendationResponse {
  events: Array<{
    event: import('./event').IEvent;
    score: IRecommendationScore;
  }>;
  hasMore: boolean;
}
