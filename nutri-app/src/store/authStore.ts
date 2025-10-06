import { defineStore } from 'pinia';
import apiClient from '../utils/apiClient';

interface User {
  _id: string;
  email: string;
  caloriesTarget: number;
  activityLevel: number;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: false,
    loading: false,
  }),

  actions: {
    async initialize() {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        this.accessToken = token;
        this.user = JSON.parse(userStr);
        this.isAuthenticated = true;

        try {
          await this.verifyToken();
        } catch {
          this.logout();
        }
      }
    },

    async register(email: string, password: string) {
      this.loading = true;
      try {
        // ✅ Folosește apiClient în loc de axios direct
        const response = await apiClient.post('/auth/register', {
          email,
          password
        });

        this.user = response.data.user;
        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;
        this.isAuthenticated = true;

        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return response.data;
      } catch (error: any) {
        console.error('❌ Eroare înregistrare:', error.response?.data || error.message);
        throw error.response?.data || { message: 'Eroare la înregistrare' };
      } finally {
        this.loading = false;
      }
    },

    async login(email: string, password: string) {
      this.loading = true;
      try {
        // ✅ Folosește apiClient în loc de axios direct
        const response = await apiClient.post('/auth/login', {
          email,
          password
        });

        this.user = response.data.user;
        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;
        this.isAuthenticated = true;

        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return response.data;
      } catch (error: any) {
        console.error('❌ Eroare login:', error.response?.data || error.message);
        throw error.response?.data || { message: 'Eroare la autentificare' };
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        if (this.refreshToken) {
          await apiClient.post('/auth/logout', { refreshToken: this.refreshToken });
        }
      } catch (error) {
        console.error('Eroare la logout:', error);
      } finally {
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.isAuthenticated = false;
        localStorage.clear();
      }
    },

    async verifyToken() {
      try {
        const response = await apiClient.get('/auth/verify');
        if (response.data.valid) {
          this.user = response.data.user;
          this.isAuthenticated = true;
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
      } catch {
        this.logout();
        return null;
      }
    }
  },

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user,
  },
});