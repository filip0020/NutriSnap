<script setup lang="ts">
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
</script>

<template>
  <nav class="bg-gray-800 p-4 shadow-lg sticky top-0 z-10">
    <div class="container mx-auto flex justify-between items-center">
      <RouterLink to="/" class="text-white text-2xl font-bold tracking-wider hover:text-green-400 transition duration-300">
        NutriSnap
      </RouterLink>

      <div class="space-x-4 flex items-center">
        <template v-if="authStore.isLoggedIn">
          <RouterLink to="/" class="text-gray-300 hover:text-white transition duration-200">Acasă</RouterLink>
          <RouterLink to="/history" class="text-gray-300 hover:text-white transition duration-200">Istoric</RouterLink>
          <RouterLink to="/profile" class="text-gray-300 hover:text-white transition duration-200">Profil</RouterLink>
          <button @click="authStore.logout" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition duration-200">
            Delogare
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="text-gray-300 hover:text-white transition duration-200">Logare</RouterLink>
          <RouterLink to="/register" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition duration-200">Înregistrare</RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>