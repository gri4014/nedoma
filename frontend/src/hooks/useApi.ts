import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { useCallback, useRef, useEffect } from 'react';

interface ApiConfig {
  baseURL?: string;
  headers?: Record<string, string>;
}

interface UseApiReturn {
  get: <T>(url: string, config?: AxiosRequestConfig) => Promise<T>;
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<T>;
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<T>;
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<T>;
  delete: <T>(url: string, config?: AxiosRequestConfig) => Promise<T>;
  instance: AxiosInstance;
}

// Create a singleton instance
const defaultInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json', // Default content type
  },
  transformRequest: [(data, headers) => {
    // Don't override Content-Type if it's already set (e.g., for FormData)
    if (data instanceof FormData) {
      delete headers['Content-Type']; // Let the browser set the content type with boundary
      return data;
    }
    return JSON.stringify(data);
  }],
});

// Add request interceptor for auth token
defaultInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
defaultInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const useApi = (config: ApiConfig = {}): UseApiReturn => {
  const configRef = useRef(config);
  const instanceRef = useRef(defaultInstance);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const CACHE_DURATION = 2000; // 2 seconds cache

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Update request interceptor when config changes
  useEffect(() => {
    const interceptorId = instanceRef.current.interceptors.request.use(
      (requestConfig: InternalAxiosRequestConfig) => {
        // Apply custom baseURL
        if (configRef.current.baseURL) {
          requestConfig.baseURL = configRef.current.baseURL;
        }

        // Apply custom headers
        if (configRef.current.headers) {
          const headers = new AxiosHeaders(requestConfig.headers || {});
          Object.entries(configRef.current.headers).forEach(([key, value]) => {
            headers.set(key, value);
          });
          requestConfig.headers = headers;
        }

        return requestConfig;
      }
    );

    return () => {
      instanceRef.current.interceptors.request.eject(interceptorId);
    };
  }, []);

  const instance = instanceRef.current;

  const get = useCallback(
    <T,>(url: string, config?: AxiosRequestConfig): Promise<T> => {
      const cacheKey = `${url}${config ? JSON.stringify(config) : ''}`;
      const cached = cacheRef.current.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return Promise.resolve(cached.data as T);
      }

      return instance.get<T>(url, config).then(response => {
        cacheRef.current.set(cacheKey, { data: response, timestamp: now });
        return response as T;
      });
    },
    []
  );

  const post = useCallback(
    <T,>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      instance.post(url, data, config),
    []
  );

  const put = useCallback(
    <T,>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      instance.put(url, data, config),
    []
  );

  const patch = useCallback(
    <T,>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      instance.patch(url, data, config),
    []
  );

  const del = useCallback(
    <T,>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      instance.delete(url, config),
    []
  );

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    instance,
  };
};
