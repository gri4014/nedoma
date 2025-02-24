export enum SwipeDirection {
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up'
}

// Business logic mapping for swipe directions
export const SwipeDirectionMeaning = {
  [SwipeDirection.LEFT]: 'uninterested',
  [SwipeDirection.RIGHT]: 'interested',
  [SwipeDirection.UP]: 'planning_to_go'
} as const;

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
