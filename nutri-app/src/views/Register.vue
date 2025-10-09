<template>
  <div class="main-page">
    <div class="login-card">
      <h2>Creare cont NutriSnap</h2>

      <form @submit.prevent="handleRegister">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div>
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="exemplu@email.com" />
        </div>

        <div>
          <label>Parolă</label>
          <input v-model="password" type="password" required minlength="6" placeholder="********" />
        </div>

        <div>
          <label>Confirmă parola</label>
          <input v-model="confirmPassword" type="password" required placeholder="********" />
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Se creează...' : 'Înregistrare' }}
        </button>

        <router-link to="/login" class="register-link">
          Ai deja cont? Autentifică-te
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
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

const handleRegister = async () => {
  error.value = '';
  if (password.value !== confirmPassword.value) {
    error.value = 'Parolele nu coincid';
    return;
  }

  loading.value = true;
  try {
    await authStore.register(email.value, password.value);
    router.push('/');
  } catch (err: any) {
    error.value = err.message || 'Eroare la înregistrare';
  } finally {
    loading.value = false;
  }
};
</script>
