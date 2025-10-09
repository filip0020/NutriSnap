import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import router from '@/router';

interface User {
  id: string;
  email: string;
  caloriesTarget: number;
  activityLevel: number;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => {
    const hasToken = !!localStorage.getItem('accessToken');
    const hasUser = !!user.value;
    return hasToken && hasUser;
  });

  // Initialize - verifică dacă utilizatorul este deja autentificat
  const initialize = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      console.log('ℹ️ Nu există tokene salvate');
      return;
    }

    console.log('🔄 Verificare token existent...');
    loading.value = true;

    try {
      // IMPORTANT: Folosim /auth/me în loc de /auth/verify
      // Acest endpoint ar trebui să returneze user-ul curent
      const response = await apiClient.get<{ user: User }>('/auth/me');
      user.value = response.data.user;
      console.log('✅ Utilizator autentificat:', user.value.email);
    } catch (err: any) {
      console.warn('⚠️ Token invalid sau expirat:', err.response?.status);

      // Dacă avem 401, token-ul a expirat - nu ștergem totul
      // Lăsăm interceptorul să încerce refresh
      if (err.response?.status === 401) {
        console.log('🔄 Token-ul va fi refresh-uit automat...');
        // Nu mai curățăm aici, interceptorul va gestiona
      } else {
        // Pentru alte erori, curățăm storage-ul
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        user.value = null;

        // Redirecționăm doar dacă nu suntem deja pe login/register
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          router.push('/login');
        }
      }
    } finally {
      loading.value = false;
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    loading.value = true;
    error.value = null;

    try {
      console.log('📤 Încercare login pentru:', email);

      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password
      });

      const { accessToken, refreshToken, user: userData } = response.data;

      // Salvăm tokenele
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Setăm user-ul
      user.value = userData;

      console.log('✅ Login reușit:', userData.email);

      // Redirecționăm la home
      router.push('/');

      return true;
    } catch (err: any) {
      console.error('❌ Eroare login:', err);
      error.value = err.response?.data?.message || 'Eroare la autentificare';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Register
  const register = async (email: string, password: string) => {
    loading.value = true;
    error.value = null;

    try {
      console.log('📤 Încercare înregistrare pentru:', email);

      const response = await apiClient.post<LoginResponse>('/auth/register', {
        email,
        password
      });

      const { accessToken, refreshToken, user: userData } = response.data;

      // Salvăm tokenele
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Setăm user-ul
      user.value = userData;

      console.log('✅ Înregistrare reușită:', userData.email);

      // Redirecționăm la home
      router.push('/');

      return true;
    } catch (err: any) {
      console.error('❌ Eroare înregistrare:', err);
      error.value = err.response?.data?.message || 'Eroare la înregistrare';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Logout
  const logout = async () => {
    loading.value = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        // Încercăm să invalidăm token-ul pe server
        try {
          await apiClient.post('/auth/logout', { refreshToken });
          console.log('✅ Logout server reușit');
        } catch (err) {
          console.warn('⚠️ Eroare logout server (continuăm cu logout local)');
        }
      }
    } finally {
      // Curățăm storage-ul și state-ul local indiferent de rezultat
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      user.value = null;
      loading.value = false;

      console.log('✅ Logout local complet');
      router.push('/login');
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<User>) => {
    loading.value = true;
    error.value = null;

    try {
      console.log('📤 Actualizare profil:', data);

      const response = await apiClient.put<{ user: User }>('/auth/profile', data);
      user.value = response.data.user;

      console.log('✅ Profil actualizat');
      return true;
    } catch (err: any) {
      console.error('❌ Eroare actualizare profil:', err);
      error.value = err.response?.data?.message || 'Eroare la actualizarea profilului';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Clear error
  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated,

    // Actions
    initialize,
    login,
    register,
    logout,
    updateProfile,
    clearError
  };
});