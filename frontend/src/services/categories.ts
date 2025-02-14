import api from './api';
import { 
  Category, 
  CategoryWithItemCount, 
  CreateCategoryData, 
  UpdateCategoryData,
  CategoryResponse,
  CategoriesResponse,
  CategoriesWithItemCountResponse
} from '../types/category';

const BASE_URL = '/restaurant/menu/categories';

export const categoryService = {
  getCategories: async (): Promise<CategoriesResponse> => {
    const response = await api.get(BASE_URL);
    return response.data;
  },

  getCategoriesWithItemCounts: async (): Promise<CategoriesWithItemCountResponse> => {
    const response = await api.get(`${BASE_URL}/with-item-counts`);
    return response.data;
  },

  createCategory: async (restaurantId: string, data: CreateCategoryData): Promise<CategoryResponse> => {
    const response = await api.post(BASE_URL, { ...data, restaurant_id: restaurantId });
    return response.data;
  },

  updateCategory: async (restaurantId: string, categoryId: string, data: UpdateCategoryData): Promise<CategoryResponse> => {
    const response = await api.patch(`${BASE_URL}/${categoryId}`, { ...data, restaurant_id: restaurantId });
    return response.data;
  },

  deleteCategory: async (categoryId: string): Promise<CategoryResponse> => {
    const response = await api.delete(`${BASE_URL}/${categoryId}`);
    return response.data;
  }
};
