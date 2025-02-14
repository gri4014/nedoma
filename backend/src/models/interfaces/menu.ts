import { BaseEntity } from './common';
import { IParameterValues } from './system';

/**
 * Interface for menu item details
 */
export interface IMenuItem extends BaseEntity {
  restaurant_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string; // Primary image (backward compatibility)
  image_urls?: string[]; // All images
  category_ids: string[]; // Array of category UUIDs
  parameters: IParameterValues;
}

/**
 * Interface for menu item creation
 */
export interface ICreateMenuItem extends Omit<IMenuItem, 'id' | 'created_at' | 'updated_at' | 'is_active'> {
  is_active?: boolean; // Optional, defaults to true
}

/**
 * Interface for menu item update
 */
export interface IUpdateMenuItem extends Partial<Omit<IMenuItem, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>> {
  is_active?: boolean;
}

/**
 * Interface for menu item filters
 */
export interface IMenuItemFilters {
  restaurant_id?: string;
  category_ids?: string[];
  price_min?: number;
  price_max?: number;
  search?: string; // Search in name and description
  parameters?: Partial<IParameterValues>;
  is_active?: boolean;
}

/**
 * Interface for menu item with populated category data
 */
export interface IMenuItemWithCategories extends IMenuItem {
  categories: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Interface for bulk menu item operations
 */
export interface IBulkMenuItemOperation {
  items: IMenuItem[];
  restaurant_id: string;
}

/**
 * Interface for menu item sorting options
 */
export interface IMenuItemSortOptions {
  field: 'name' | 'price' | 'created_at';
  direction: 'ASC' | 'DESC';
}

/**
 * Interface for menu section (grouping of items)
 */
export interface IMenuSection {
  category_id: string;
  category_name: string;
  items: IMenuItem[];
}

/**
 * Interface for complete menu structure
 */
export interface ICompleteMenu {
  restaurant_id: string;
  sections: IMenuSection[];
  last_updated: Date;
}
