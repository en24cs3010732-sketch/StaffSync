import axios from 'axios';

// In dev, Vite proxies /api to the backend (see vite.config.js).
// Set VITE_API_URL in client/.env if you host the API elsewhere.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Endpoints where a 401 just means "wrong credentials" - show the error, don't redirect.
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register'];

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((p) => url.includes(p));

    if (error.response?.status === 401 && !isPublicAuthCall) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
