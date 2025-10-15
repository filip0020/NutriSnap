<template>
  <div class="main-page">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-container">
          <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2>Autentificare NutriSnap</h2>
        <p class="subtitle">Bine ai revenit! Loghează-te pentru a continua.</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <!-- Error Alert -->
        <transition name="fade">
          <div v-if="error" class="error-alert">
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="error-content">
              <strong class="error-title">{{ errorTitle }}</strong>
              <p class="error-description">{{ errorDescription }}</p>
            </div>
            <button type="button" @click="clearError" class="error-close">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </transition>

        <!-- Success Alert -->
        <transition name="fade">
          <div v-if="successMessage" class="success-alert">
            <svg class="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="success-content">
              <strong>{{ successMessage }}</strong>
            </div>
          </div>
        </transition>

        <!-- Email Field -->
        <div class="form-group">
          <label for="email" class="form-label">
            <svg class="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Adresa de Email
          </label>
          <input id="email" v-model="email" type="email" required placeholder="nume@exemplu.com"
            :class="['form-input', { 'input-error': emailError }]" @input="clearFieldError('email')"
            @blur="validateEmail" />
          <span v-if="emailError" class="field-error">{{ emailError }}</span>
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password" class="form-label">
            <svg class="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Parolă
          </label>
          <div class="password-input-wrapper">
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" required
              placeholder="Introdu parola" :class="['form-input', 'password-field', { 'input-error': passwordError }]"
              @input="clearFieldError('password')" minlength="6" />
            <button type="button" @click="togglePasswordVisibility" class="password-toggle" tabindex="-1">
              <svg v-if="!showPassword" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
          <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
        </div>

        <!-- Submit Button -->
        <button type="submit" :disabled="loading || !isFormValid" class="submit-btn">
          <span v-if="!loading" class="btn-content">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Autentificare
          </span>
          <span v-else class="btn-content loading">
            <span class="spinner-small"></span>
            Se încarcă...
          </span>
        </button>

        <!-- Register Link -->
        <div class="register-section">
          <span class="register-text">Nu ai cont?</span>
          <router-link to="/register" class="register-link">
            Înregistrează-te gratuit
          </router-link>
        </div>
      </form>

      <!-- Info Section -->
      <div class="info-section">
        <p class="info-text">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd" />
          </svg>
          Datele tale sunt protejate și criptate
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const errorTitle = ref('');
const errorDescription = ref('');
const emailError = ref('');
const passwordError = ref('');
const successMessage = ref('');
const loading = ref(false);

const isFormValid = computed(() => {
  return email.value.length > 0 &&
    password.value.length >= 6 &&
    !emailError.value &&
    !passwordError.value;
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value) {
    emailError.value = '';
    return;
  }
  if (!emailRegex.test(email.value)) {
    emailError.value = 'Te rugăm să introduci un email valid';
  } else {
    emailError.value = '';
  }
};

const clearFieldError = (field: string) => {
  if (field === 'email') emailError.value = '';
  if (field === 'password') passwordError.value = '';
  error.value = '';
};

const clearError = () => {
  error.value = '';
  errorTitle.value = '';
  errorDescription.value = '';
};

const parseError = (err: any) => {
  const errorMsg = err.message || err.response?.data?.message || 'Eroare necunoscută';

  if (errorMsg.includes('Invalid credentials') || errorMsg.includes('credentials')) {
    errorTitle.value = 'Date de autentificare incorecte';
    errorDescription.value = 'Email-ul sau parola introduse sunt greșite. Te rugăm să verifici și să încerci din nou.';
  } else if (errorMsg.includes('User not found') || errorMsg.includes('not found')) {
    errorTitle.value = 'Cont inexistent';
    errorDescription.value = 'Nu am găsit niciun cont asociat cu acest email. Te rugăm să te înregistrezi mai întâi.';
  } else if (errorMsg.includes('Network') || errorMsg.includes('ECONNREFUSED')) {
    errorTitle.value = 'Eroare de conexiune';
    errorDescription.value = 'Nu ne putem conecta la server. Verifică conexiunea la internet sau încearcă din nou mai târziu.';
  } else if (errorMsg.includes('timeout')) {
    errorTitle.value = 'Timp de așteptare expirat';
    errorDescription.value = 'Serverul nu răspunde. Te rugăm să încerci din nou.';
  } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
    errorTitle.value = 'Acces neautorizat';
    errorDescription.value = 'Nu ai permisiunea de a accesa acest cont. Verifică datele introduse.';
  } else if (errorMsg.includes('500') || errorMsg.includes('Server Error')) {
    errorTitle.value = 'Eroare de server';
    errorDescription.value = 'A apărut o problemă pe server. Încearcă din nou în câteva momente.';
  } else if (errorMsg.includes('rate limit')) {
    errorTitle.value = 'Prea multe încercări';
    errorDescription.value = 'Ai făcut prea multe încercări de autentificare. Te rugăm să aștepți câteva minute.';
  } else {
    errorTitle.value = 'Eroare la autentificare';
    errorDescription.value = errorMsg;
  }

  error.value = errorMsg;
};

const handleLogin = async () => {
  validateEmail();

  if (!email.value) {
    emailError.value = 'Email-ul este obligatoriu';
    return;
  }

  if (!password.value) {
    passwordError.value = 'Parola este obligatorie';
    return;
  }

  if (password.value.length < 6) {
    passwordError.value = 'Parola trebuie să conțină cel puțin 6 caractere';
    return;
  }

  clearError();
  loading.value = true;

  try {
    const result = await authStore.login(email.value, password.value);

    // Verifică dacă login-ul a eșuat
    if (!result || authStore.error) {
      // Login eșuat - folosește mesajul de eroare din store
      const storeError = authStore.error || 'Autentificare eșuată';

      if (storeError.includes('parolă') || storeError.includes('incorectă')) {
        errorTitle.value = 'Date de autentificare incorecte';
        errorDescription.value = 'Email-ul sau parola introduse sunt greșite. Te rugăm să verifici și să încerci din nou.';
      } else if (storeError.includes('conexiune') || storeError.includes('network')) {
        errorTitle.value = 'Eroare de conexiune';
        errorDescription.value = 'Nu ne putem conecta la server. Verifică conexiunea la internet sau încearcă din nou mai târziu.';
      } else if (storeError.includes('Timeout')) {
        errorTitle.value = 'Timp de așteptare expirat';
        errorDescription.value = 'Serverul nu răspunde. Te rugăm să încerci din nou.';
      } else {
        errorTitle.value = 'Eroare la autentificare';
        errorDescription.value = storeError;
      }

      error.value = storeError;
      authStore.clearError();
      return;
    }

    // Login reușit
    successMessage.value = 'Autentificare reușită! Redirecționare...';

    setTimeout(() => {
      router.push('/');
    }, 800);
  } catch (err: any) {
    console.error('Login error:', err);
    parseError(err);
  } finally {
    loading.value = false;
  }
};
</script>