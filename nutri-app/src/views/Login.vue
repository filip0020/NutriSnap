<template>
  <div class="main-page">
    <div class="login-card">
      <h2>Autentificare NutriSnap</h2>
      <form @submit.prevent="handleLogin">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div>
          <label>Email</label>
          <input v-model="email" type="email" required />
        </div>

        <div>
          <label>Parolă</label>
          <input v-model="password" type="password" required />
        </div>

        <button :disabled="loading">{{ loading ? 'Se încarcă...' : 'Autentificare' }}</button>

        <router-link to="/register" class="register-link">
          Nu ai cont? Înregistrează-te
        </router-link>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  error.value = '';
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (err: any) {
    error.value = err.message || 'Eroare la autentificare';
  } finally {
    loading.value = false;
  }
};
</script>
