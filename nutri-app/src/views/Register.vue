<template>
  <div class="register-container" :class="{ dark: isDark }">
    <div class="background-grid"></div>

    <div class="gradient-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
    </div>

    <button class="theme-toggle" @click="isDark = !isDark">
      <Sun v-if="isDark" />
      <Moon v-else />
    </button>

    <div class="register-card">
      <h2 class="register-title">Creare cont NutriSnap</h2>

      <form @submit.prevent="handleRegister">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="exemplu@email.com" />
        </div>

        <div class="form-group">
          <label>Parolă</label>
          <input v-model="password" type="password" required minlength="6" placeholder="********" />
        </div>

        <div class="form-group">
          <label>Confirmă parola</label>
          <input v-model="confirmPassword" type="password" required placeholder="********" />
        </div>

        <button type="submit" :disabled="loading" class="submit-btn">
          <div v-if="loading" class="spinner"></div>
          <span>{{ loading ? 'Se creează...' : 'Înregistrare' }}</span>
        </button>

        <div class="link-center">
          <router-link to="/login">Ai deja cont? Autentifică-te</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/authStore'
import { Moon, Sun } from 'lucide-vue-next'
import '../styles/main.scss';

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const isDark = ref(true)

const handleRegister = async () => {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'Parolele nu coincid'
    return
  }
  loading.value = true
  try {
    await authStore.register(email.value, password.value)
    router.push('/')
  } catch (err: any) {
    error.value = err.message || 'Eroare la înregistrare'
  } finally {
    loading.value = false
  }
}
</script>
