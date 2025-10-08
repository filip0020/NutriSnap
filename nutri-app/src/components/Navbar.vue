<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useAuthStore } from '../store/authStore'

const props = defineProps<{ isDark: boolean }>()
const emit = defineEmits<{ (e: 'toggle-theme'): void }>()
const authStore = useAuthStore()
</script>

<template>
  <nav class="navbar">
    <div class="navbar-container container">
      <RouterLink to="/" class="navbar-brand">
        NutriSnap
      </RouterLink>

      <div class="navbar-menu">
        <template v-if="authStore.isLoggedIn">
          <RouterLink to="/" class="nav-link">Acasă</RouterLink>
          <RouterLink to="/history" class="nav-link">Istoric</RouterLink>
          <RouterLink to="/profile" class="nav-link">Profil</RouterLink>
          <button @click="authStore.logout" class="btn btn-danger">Delogare</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nav-link">Logare</RouterLink>
          <RouterLink to="/register" class="btn btn-primary">Înregistrare</RouterLink>
        </template>

        <button @click="emit('toggle-theme')" class="btn" style="padding: 0.5rem;">
          <Sun v-if="!props.isDark" style="width: 1.25rem; height: 1.25rem; color: #eab308;" />
          <Moon v-else style="width: 1.25rem; height: 1.25rem; color: #60a5fa;" />
        </button>
      </div>
    </div>
  </nav>
</template>