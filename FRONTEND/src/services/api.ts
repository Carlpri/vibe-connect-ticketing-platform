import axios from 'axios';

/**
 * Central Axios instance for all VIBE-CONNECT API requests.
 *
 * Base URL comes from VITE_API_URL env var. The backend mounts all
 * routes under /api, so this client prefixes every request with /api.
 *
 * Auth token is injected via a request interceptor so callers never
 * have to manually attach the Authorization header.
 */
const rawApiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
const normalizedBaseURL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const apiClient = axios.create({
  baseURL: normalizedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ---------- Request interceptor — attach JWT Bearer token ----------
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- Response interceptor — normalise errors ----------
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local auth state
      localStorage.removeItem('vc_token');
      localStorage.removeItem('vc_user');
      // Redirect to login only if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
