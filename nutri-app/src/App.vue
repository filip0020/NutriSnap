<script setup lang="ts">
import Navbar from '../src/components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    <Navbar />
    
    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>
    
  </div>
</template>