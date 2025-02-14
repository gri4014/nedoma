export enum SwipeDirection {
  LEFT = 'uninterested',
  RIGHT = 'interested',
  UP = 'planning_to_go'
}

export interface ISwipe {
  id: string;
  user_id: string;
  event_id: string;
  direction: SwipeDirection;
  created_at: Date;
  updated_at: Date;
}

export interface ICreateSwipe {
  user_id: string;
  event_id: string;
  direction: SwipeDirection;
}

export interface IUserSwipeStats {
  total_swipes: number;
  interested_count: number;
  planning_count: number;
  category_preferences: Record<string, number>;
  tag_preferences: Record<string, {
    true_count: number;
    false_count: number;
    value_counts: Record<string, number>;
  }>;
}
