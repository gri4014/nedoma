export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

export interface CategoryCreateRequest {
  name: string;
  parent_id?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  parent_id?: string | null;
}

export interface CategoryResponse {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryTreeResponse {
  categories: CategoryTree[];
}

export interface ApiCategoryResponse {
  data: Category[];
}
