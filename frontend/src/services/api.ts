import axios from 'axios';
import { IEvent } from '../types/event';

interface Admin {
  id: string;
  login: string;
  lastLogin: string | null;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
    }
    throw error;
  }
);

interface LoginResponse {
  token: string;
  admin: Admin;
}

interface LoginData {
  login: string;
  password: string;
}

const authApi = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/admin/login', data);
    return response.data;
  }
};

// Event API methods
const eventApi = {
  // Get all events with pagination (admin)
  getEvents: (page: number = 1) => 
    api.get(`/admin/events?page=${page}`),

  // Get a single event by ID (admin)
  getEvent: (eventId: string) => 
    api.get(`/admin/events/${eventId}`),

  // Create a new event (admin)
  createEvent: (formData: FormData) => 
    api.post('/admin/events', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Update an existing event (admin)
  updateEvent: (eventId: string, formData: FormData) => 
    api.put(`/admin/events/${eventId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Delete an event (admin)
  deleteEvent: (eventId: string) => 
    api.delete(`/admin/events/${eventId}`),
};

// User-facing event API methods
const userEventApi = {
  // Get active events with pagination
  getAllEvents: async (page: number = 1, limit: number = 10): Promise<IEvent[]> => {
    const response = await api.get<any>(`/admin/events?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  // Swipe interactions
  swipeLeft: async (eventId: string): Promise<void> => {
    await api.post('/user/swipes', { eventId, direction: 'LEFT' });
  },

  swipeRight: async (eventId: string): Promise<void> => {
    await api.post('/user/swipes', { eventId, direction: 'RIGHT' });
  },

  swipeUp: async (eventId: string): Promise<void> => {
    await api.post('/user/swipes', { eventId, direction: 'UP' });
  },

  // Get user's interested and planning to go events
  getInterestedEvents: async (): Promise<IEvent[]> => {
    const response = await api.get<any>('/user/swipes/interested');
    return response.data.data;
  },

  getPlanningEvents: async (): Promise<IEvent[]> => {
    const response = await api.get<any>('/user/swipes/planning');
    return response.data.data;
  },
};

// Category API methods
const categoryApi = {
  // Get all categories
  getCategories: () => 
    api.get('/admin/categories'),

  // Get categories with event counts
  getCategoriesWithEventCounts: () => 
    api.get('/admin/categories/with-events'),
};

// Tag API methods
const tagApi = {
  // Get all tags
  getTags: () => 
    api.get('/admin/tags'),

  // Get tags by category
  getTagsByCategory: (categoryId: string) => 
    api.get(`/admin/tags/category/${categoryId}`),
};

// Dashboard API methods
const dashboardApi = {
  getSystemHealth: () => api.get('/system/health')
};

export { api as default, authApi, dashboardApi, eventApi, userEventApi, categoryApi, tagApi };
