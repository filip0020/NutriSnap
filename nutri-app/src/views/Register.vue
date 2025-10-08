<template>
  <div
    :class="['min-h-screen flex items-center justify-center relative transition-all duration-700', isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900']">

    <!-- Background Grid -->
    <div class="fixed inset-0 opacity-20 pointer-events-none" :style="{
      backgroundImage: isDark
        ? 'linear-gradient(to right, rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.03) 1px, transparent 1px)'
        : 'linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px)',
      backgroundSize: '80px 80px'
    }"></div>

    <!-- Gradient Orbs -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-blob">
      </div>
      <div
        class="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-emerald-500/10 to-green-500/10 rounded-full blur-3xl animate-blob animation-delay-2000">
      </div>
    </div>

    <!-- Toggle Theme -->
    <button @click="isDark = !isDark"
      class="absolute top-6 right-6 z-50 p-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-110">
      <Sun v-if="isDark" class="w-5 h-5 text-yellow-300" />
      <Moon v-else class="w-5 h-5 text-indigo-600" />
    </button>

    <!-- Card -->
    <div
      class="relative z-10 w-full max-w-md p-8 rounded-3xl backdrop-blur-xl border shadow-2xl transition-all duration-500"
      :class="isDark
        ? 'bg-gradient-to-br from-slate-900/40 to-slate-800/20 border-white/10'
        : 'bg-gradient-to-br from-white to-gray-100 border-gray-200'">

      <h2
        class="text-center text-3xl font-extrabold mb-6 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
        Creare cont NutriSnap
      </h2>

      <form @submit.prevent="handleRegister" class="space-y-6">

        <!-- Error -->
        <div v-if="error"
          class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded text-center text-sm">
          {{ error }}
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm mb-1 font-semibold"
            :class="isDark ? 'text-white/70' : 'text-gray-700'">Email</label>
          <input v-model="email" type="email" required
            class="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200"
            :class="isDark
              ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:ring-emerald-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-emerald-500'"
            placeholder="exemplu@email.com" />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm mb-1 font-semibold"
            :class="isDark ? 'text-white/70' : 'text-gray-700'">Parolă</label>
          <input v-model="password" type="password" required minlength="6"
            class="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200"
            :class="isDark
              ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:ring-emerald-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-emerald-500'"
            placeholder="********" />
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block text-sm mb-1 font-semibold" :class="isDark ? 'text-white/70' : 'text-gray-700'">Confirmă
            parola</label>
          <input v-model="confirmPassword" type="password" required
            class="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200"
            :class="isDark
              ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:ring-emerald-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-emerald-500'"
            placeholder="********" />
        </div>

        <!-- Submit -->
        <button type="submit" :disabled="loading"
          class="w-full py-3 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          :class="loading
            ? 'bg-gradient-to-r from-gray-500 to-gray-600'
            : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400'">
          <div v-if="loading" class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent">
          </div>
          <span>{{ loading ? 'Se creează...' : 'Înregistrare' }}</span>
        </button>

        <!-- Link -->
        <div class="text-center">
          <router-link to="/login"
            class="font-semibold text-emerald-400 hover:text-emerald-300 transition-all duration-200">
            Ai deja cont? Autentifică-te
          </router-link>
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

<style scoped>
@keyframes blob {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -50px) scale(1.1);
  }

  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-blob {
  animation: blob 20s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}
</style>
