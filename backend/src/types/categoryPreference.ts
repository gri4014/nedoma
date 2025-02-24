import type { Category } from './category';

export interface SubcategoryPreference {
  subcategoryId: string;
  level: 0 | 1 | 2;
}

// Keeping the CategoryPreference type for backwards compatibility
export interface CategoryPreference {
  categoryId: string;  // This is actually subcategoryId now
  interestLevel: 0 | 1 | 2;  // This maps to level
}

export interface UserSubcategoryPreferences {
  userId: string;
  preferences: SubcategoryPreference[];
}

export interface UserCategoryPreferences {
  userId: string;
  preferences: CategoryPreference[];
}

export interface CategoryWithPreference extends Category {
  level: 0 | 1 | 2;
}

export interface SetPreferencesRequest {
  preferences: (CategoryPreference | SubcategoryPreference)[];
}

export interface GetPreferencesResponse {
  preferences: (CategoryPreference | SubcategoryPreference)[];
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiCategoryResponse {
  data: Category[];
}
