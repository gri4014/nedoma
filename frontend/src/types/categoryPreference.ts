import { Category } from './category';

export interface CategoryPreference {
  categoryId: string;
  interestLevel: 0 | 1 | 2 | 3;
}

export interface UserCategoryPreferences {
  userId: string;
  preferences: CategoryPreference[];
}

export interface CategoryWithPreference extends Category {
  interestLevel: 0 | 1 | 2 | 3;
}

export interface SetPreferencesRequest {
  preferences: CategoryPreference[];
}

export interface GetPreferencesResponse {
  preferences: CategoryPreference[];
}

export interface ApiCategoryResponse {
  data: Category[];
}

export interface ApiResponse<T> {
  data: T;
}
