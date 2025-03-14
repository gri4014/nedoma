import axios from 'axios';
import { IEvent } from '../types/event';
import { IRecommendationResponse } from '../types/recommendation';

// Enum values matching backend's SwipeDirection
const SwipeDirection = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up'
} as const;

interface Admin {
  id: string;
  login: string;
  last_login: string | null;
}

// Create public instance (no auth handling)
const publicApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Create authenticated instance (with auth handling)
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
  // Get all events (no recommendations)
  getAllEvents: async (page: number = 1, limit: number = 10, excludeEventIds: string[] = []): Promise<IEvent[]> => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (excludeEventIds.length > 0) {
      queryParams.append('excludeEventIds', excludeEventIds.join(','));
    }

    const response = await api.get<{ success: boolean, data: IEvent[] }>(`/admin/events?${queryParams.toString()}`);
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  },

  // Get recommended events with pagination
  getRecommendedEvents: async (page: number = 1, limit: number = 10, excludeEventIds: string[] = []): Promise<IRecommendationResponse> => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (excludeEventIds.length > 0) {
      queryParams.append('excludeEventIds', excludeEventIds.join(','));
    }

    const response = await api.get<IRecommendationResponse>(`/user/recommendations?${queryParams.toString()}`);
    return response.data;
  },

  // Swipe interactions
  swipeLeft: async (eventId: string): Promise<void> => {
    try {
      const response = await api.post('/user/swipes', { 
        eventId: eventId, 
        direction: SwipeDirection.LEFT 
      });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to record swipe');
      }
    } catch (error) {
      console.error('Error recording left swipe:', error);
      throw error;
    }
  },

  swipeRight: async (eventId: string): Promise<void> => {
    try {
      const response = await api.post('/user/swipes', { 
        eventId: eventId, 
        direction: SwipeDirection.RIGHT 
      });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to record swipe');
      }
    } catch (error) {
      console.error('Error recording right swipe:', error);
      throw error;
    }
  },

  swipeUp: async (eventId: string): Promise<void> => {
    try {
      const response = await api.post('/user/swipes', { 
        eventId: eventId, 
        direction: SwipeDirection.UP 
      });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to record swipe');
      }
    } catch (error) {
      console.error('Error recording up swipe:', error);
      throw error;
    }
  },

  // Get user's interested and planning to go events
  getInterestedEvents: async (): Promise<IEvent[]> => {
    const response = await api.get<any>('/user/swipes/interested');
    // Extract event data from the swipe objects
    return response.data.data.map((item: any) => item.event);
  },

  getPlanningEvents: async (): Promise<IEvent[]> => {
    const response = await api.get<any>('/user/swipes/planning');
    // Extract event data from the swipe objects
    return response.data.data.map((item: any) => item.event);
  },

  undoLastSwipe: async (): Promise<{ event_id: string } | null> => {
    try {
      const response = await api.delete<any>('/user/swipes/latest');
      if (response.data.success && response.data.data) {
        return {
          event_id: response.data.data.event_id
        };
      }
      return null;
    } catch (error) {
      console.error('Error undoing last swipe:', error);
      return null;
    }
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

export { 
  api as default, 
  publicApi,
  authApi, 
  dashboardApi, 
  eventApi, 
  userEventApi, 
  categoryApi, 
  tagApi 
};
