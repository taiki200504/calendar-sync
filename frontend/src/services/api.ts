import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
});

// Token will be set by ClerkAuthProvider
let getTokenFn: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

// Request interceptor to add Clerk JWT
api.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    try {
      const token = await getTokenFn();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to get auth token:', err);
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url ?? 'unknown';

    if (error.response?.status === 401) {
      console.debug('Auth check failed:', { url });
      // Clerk handles auth redirects, so we just reject
      return Promise.reject(error);
    }

    if (error.response?.status === 500) {
      const data = error.response?.data;
      console.error('[500] Failed request:', url, data ?? error.message);
    }

    return Promise.reject(error);
  }
);

export async function searchFreeSlots(params: any): Promise<any[]> {
  const response = await api.post('/freebusy/search', params);
  return response.data.slots;
}

export default api;
