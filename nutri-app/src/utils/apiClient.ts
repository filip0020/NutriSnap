import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ Configurare corectă API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('🔵 API_URL configurat:', API_URL);

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: false
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
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
      message: error.message
    });

    // Nu este eroare 401 sau am încercat deja refresh
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Dacă suntem pe endpoint-ul de login/register, nu încercăm refresh
    if (originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      console.warn('⚠️ Nu există refresh token, redirecționare către login');
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      console.log('🔄 Încercare refresh token...');
      const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      console.log('✅ Token refreshed cu succes');

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      processQueue(null, accessToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      console.error('❌ Eroare la refresh token:', refreshError);
      processQueue(refreshError, null);
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;