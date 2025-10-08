<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Navbar from './components/Navbar.vue'

const isDark = ref(true)

onMounted(() => {
  const saved = sessionStorage.getItem('theme')
  isDark.value = saved === 'dark'
  document.documentElement.classList.toggle('dark', isDark.value)
})

watch(isDark, val => {
  document.documentElement.classList.toggle('dark', val)
  sessionStorage.setItem('theme', val ? 'dark' : 'light')
})
</script>

<template>
  <div :class="{ 'dark': isDark }">
    <Navbar :isDark="isDark" @toggle-theme="isDark = !isDark" />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>