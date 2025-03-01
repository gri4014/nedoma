export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

export interface SubcategoryData {
  id: string;
  name: string;
  categoryName: string;
  display_order?: number;
}

export interface CategoryData {
  id: string;
  name: string;
  children: SubcategoryData[];
}

export interface CategoryCreateRequest {
  name: string;
  parent_id?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryUpdateRequest {
  name?: string;
  parent_id?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryResponse {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryTreeResponse {
  categories: CategoryTree[];
}

export interface CategoryBulkOrderUpdateRequest {
  orders: Array<{
    id: string;
    display_order: number;
  }>;
}
