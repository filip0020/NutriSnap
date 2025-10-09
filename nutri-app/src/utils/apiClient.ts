import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('🔵 API_URL configurat:', API_URL);

// ✅ Helper to check if token is expired
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]!));
    const exp = payload.exp * 1000;
    const now = Date.now();
    const isExpired = now >= exp;
    console.log('🔍 Token check:', { exp: new Date(exp), now: new Date(now), isExpired });
    return isExpired;
  } catch (e) {
    console.error('❌ Error parsing token:', e);
    return true;
  }
};

// ✅ Helper to validate tokens before requests
const validateTokens = (): boolean => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken || !refreshToken) {
    console.warn('⚠️ Missing tokens');
    return false;
  }

  // If access token is expired but refresh token is valid, we can refresh
  if (isTokenExpired(accessToken)) {
    if (isTokenExpired(refreshToken)) {
      console.warn('⚠️ Both tokens expired');
      localStorage.clear();
      return false;
    }
    console.log('⚠️ Access token expired, but refresh token valid');
  }

  return true;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
  withCredentials: false
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');

    // ✅ Don't add token to public endpoints
    const publicEndpoints = ['/auth/login', '/auth/register'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));

    if (accessToken && config.headers && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const url = config.baseURL && config.url ? `${config.baseURL}${config.url}` : config.url || 'unknown';
    console.log('📤 Request către:', url);
    console.log('🔑 Token prezent:', !!accessToken);

    return config;
  },
  (error) => {
    console.error('❌ Eroare request interceptor:', error);
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: any; reject: any }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response success:', response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    console.error('❌ Response error:', {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });

    // ✅ Handle timeout errors - DON'T logout on timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('⏱️ Request timeout - server might be cold starting');

      // ✅ For /auth/verify or /auth/me timeout, try to use cached token instead of logging out
      if (originalRequest.url?.includes('/auth/verify') || originalRequest.url?.includes('/auth/me')) {
        console.warn('⚠️ Auth verification timeout - keeping user logged in with cached token');
        return Promise.reject({
          ...error,
          message: 'Connection timeout. You will remain logged in.',
          skipLogout: true // Custom flag
        });
      }

      return Promise.reject({
        ...error,
        message: 'Server is starting up. Please wait and try again.'
      });
    }

    // ✅ Handle network errors
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Network error - check connection');
      return Promise.reject({
        ...error,
        message: 'Cannot connect to server. Please check your internet connection.',
        skipLogout: true
      });
    }

    // ✅ Not a 401 or already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ✅ Don't try to refresh for these endpoints
    const noRefreshEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    if (noRefreshEndpoints.some(endpoint => originalRequest.url?.includes(endpoint))) {
      return Promise.reject(error);
    }

    // ✅ For /auth/verify or /auth/me - if it fails with 401, just logout silently
    if (originalRequest.url?.includes('/auth/verify') || originalRequest.url?.includes('/auth/me')) {
      console.warn('⚠️ Auth verification returned 401 - token invalid, logging out');
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ✅ Check if refresh token exists and is valid
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || isTokenExpired(refreshToken)) {
      console.warn('⚠️ Refresh token missing or expired, logging out');
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ✅ Queue mechanism to prevent multiple refresh calls
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          // Retry with new token
          if (originalRequest.headers) {
            const newToken = localStorage.getItem('accessToken');
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      console.log('🔄 Attempting token refresh...');

      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { accessToken: newAccessToken } = response.data;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      localStorage.setItem('accessToken', newAccessToken);
      console.log('✅ Token refreshed successfully');

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null, newAccessToken);

      return apiClient(originalRequest);

    } catch (refreshError: any) {
      console.error('❌ Token refresh failed:', refreshError.message);

      processQueue(refreshError, null);
      localStorage.clear();

      // ✅ Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ✅ Export helper for components to check auth state
export const checkAuth = (): boolean => {
  return validateTokens();
};

export default apiClient;