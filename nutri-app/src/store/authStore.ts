import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient, { checkAuth } from '@/utils/apiClient';
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

  const initialize = async () => {
    // ✅ First check if tokens exist and are valid (client-side check)
    if (!checkAuth()) {
      console.log('ℹ️ Nu există tokene valide salvate');
      return;
    }

    console.log('🔄 Verificare token existent...');
    loading.value = true;

    try {
      // ✅ Get cached user first
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          user.value = JSON.parse(cachedUser);
          console.log('✅ User cached loaded:', user.value?.email);
        } catch (e) {
          console.error('❌ Error parsing cached user');
        }
      }

      // ✅ Then verify with server (with shorter timeout) - FIXED PATH
      try {
        const response = await apiClient.get<{ user: User }>('/api/auth/verify', {
          timeout: 10000 // 10s timeout for verification
        });
        user.value = response.data.user;
        // Update cache
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('✅ Utilizator verificat cu server:', user.value.email);
      } catch (verifyError: any) {
        console.warn('⚠️ Server verification failed:', verifyError.message);

        // ✅ If timeout or network error, keep user logged in with cached data
        if (verifyError.skipLogout || verifyError.code === 'ECONNABORTED' || verifyError.code === 'ERR_NETWORK') {
          console.log('🔄 Keeping user logged in despite verification failure');
          if (!user.value && cachedUser) {
            try {
              user.value = JSON.parse(cachedUser);
              console.log('✅ Using cached user data');
            } catch (e) {
              console.error('❌ Failed to parse cached user');
            }
          }
        } else if (verifyError.response?.status === 401) {
          // ✅ Real auth error - logout
          console.log('❌ Token invalid (401) - logging out');
          localStorage.clear();
          user.value = null;

          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register') {
            router.push('/login');
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Initialize error:', err);
      // Don't logout on general errors
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

      // FIXED PATH: /api/auth/login
      const response = await apiClient.post<LoginResponse>('/api/auth/login', {
        email,
        password
      });

      const { accessToken, refreshToken, user: userData } = response.data;

      // Salvăm tokenele și user-ul
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Setăm user-ul
      user.value = userData;

      console.log('✅ Login reușit:', userData.email);

      // Redirecționăm la home
      router.push('/');

      return true;
    } catch (err: any) {
      console.error('❌ Eroare login:', err);

      if (err.code === 'ECONNABORTED') {
        error.value = 'Timeout: Serverul nu răspunde. Încearcă din nou.';
      } else if (err.code === 'ERR_NETWORK') {
        error.value = 'Eroare de conexiune. Verifică dacă serverul rulează.';
      } else if (err.response?.status === 401) {
        error.value = 'Email sau parolă incorectă';
      } else {
        error.value = err.response?.data?.message || 'Eroare la autentificare';
      }

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

      // FIXED PATH: /api/auth/register
      const response = await apiClient.post<LoginResponse>('/api/auth/register', {
        email,
        password
      });

      const { accessToken, refreshToken, user: userData } = response.data;

      // Salvăm tokenele și user-ul
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Setăm user-ul
      user.value = userData;

      console.log('✅ Înregistrare reușită:', userData.email);

      // Redirecționăm la home
      router.push('/');

      return true;
    } catch (err: any) {
      console.error('❌ Eroare înregistrare:', err);

      if (err.code === 'ECONNABORTED') {
        error.value = 'Timeout: Serverul nu răspunde. Încearcă din nou.';
      } else if (err.code === 'ERR_NETWORK') {
        error.value = 'Eroare de conexiune. Verifică dacă serverul rulează.';
      } else if (err.response?.status === 400) {
        error.value = err.response?.data?.message || 'Date invalide';
      } else if (err.response?.status === 409) {
        error.value = 'Email-ul este deja înregistrat';
      } else {
        error.value = err.response?.data?.message || 'Eroare la înregistrare';
      }

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
        // Încercăm să invalidăm token-ul pe server (fire and forget)
        try {
          // FIXED PATH: /api/auth/logout
          await apiClient.post('/api/auth/logout', { refreshToken }, {
            timeout: 5000 // Short timeout
          });
          console.log('✅ Logout server reușit');
        } catch (err) {
          console.warn('⚠️ Eroare logout server (continuăm cu logout local)');
        }
      }
    } finally {
      // Curățăm storage-ul și state-ul local indiferent de rezultat
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
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

      // FIXED PATH: /api/auth/profile
      const response = await apiClient.put<{ user: User }>('/api/auth/profile', data);
      user.value = response.data.user;

      // Update cache
      localStorage.setItem('user', JSON.stringify(response.data.user));

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