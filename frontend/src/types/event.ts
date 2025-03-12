export interface PriceRange {
  min: number;
  max: number;
}

export interface EventTag {
  id: string;
  selected_values: string[];
}

export interface BaseEvent {
  name: string;
  short_description: string;
  long_description?: string;
  image_urls: (string | File)[];
  links: string[];
  event_dates: Date[];
  subcategories: string[];
  address?: string;
  is_active: boolean;
  is_free: boolean;
  price_range: PriceRange | null;
  tags: Record<string, string[]>;
  display_dates: boolean;
}

export type CreateEventInput = BaseEvent;

export type UpdateEventInput = Partial<BaseEvent>;

export interface IEvent extends BaseEvent {
  id: string;
  created_at: Date;
  updated_at: Date;
}
