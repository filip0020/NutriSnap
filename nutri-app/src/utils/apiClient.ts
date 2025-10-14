import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ Config corect pentru Render + Vercel
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://nutrisnap-y86m.onrender.com/api');

console.log('🔵 API_URL configurat:', API_URL);

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

// ✅ Verificare tokenuri înainte de requesturi
const validateTokens = (): boolean => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken || !refreshToken) {
    console.warn('⚠️ Missing tokens');
    return false;
  }

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

// ✅ Instanța principală Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL, // ← prefix corect
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
  withCredentials: false,
});

// 🔄 Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    const publicEndpoints = ['/auth/login', '/auth/register']; // fără /api, baseURL deja are /api
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));

    if (accessToken && config.headers && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    console.log('📤 Request către:', `${config.baseURL}${config.url}`);
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
  failedQueue.forEach(prom => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

// 🔁 Response interceptor
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
      code: error.code,
    });

    // Timeouts sau network
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return Promise.reject({
        ...error,
        message: 'Server is starting up. Please wait and try again.',
      });
    }
    if (error.code === 'ERR_NETWORK') {
      return Promise.reject({
        ...error,
        message: 'Cannot connect to server. Check your internet connection.',
        skipLogout: true,
      });
    }

    // Doar pentru 401
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const noRefreshEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    if (noRefreshEndpoints.some(endpoint => originalRequest.url?.includes(endpoint))) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || isTokenExpired(refreshToken)) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Queue refresh
    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then((newToken) => {
          if (originalRequest.headers) {
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

      // ✅ FIX: fără dublu /api/api
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const { accessToken: newAccessToken } = response.data;
      if (!newAccessToken) throw new Error('No access token in refresh response');

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
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const checkAuth = (): boolean => validateTokens();

export default apiClient;
