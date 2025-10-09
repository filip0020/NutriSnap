<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/utils/apiClient';

const name = ref('');
const calories = ref(0);
const entryType = ref<'manual' | 'exercise'>('manual');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const emit = defineEmits(['entry-saved']);

const clearForm = () => {
  name.value = '';
  calories.value = 0;
  entryType.value = 'manual';
  error.value = null;
  successMessage.value = null;
};

const handleSubmit = async () => {
  if (!name.value || calories.value <= 0) {
    error.value = 'Completează numele și caloriile (trebuie să fie > 0).';
    return;
  }

  isLoading.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const payload = {
      name: name.value,
      calories: entryType.value === 'exercise' ? -Math.abs(calories.value) : calories.value,
      nutrients: entryType.value === 'manual'
        ? { protein: 0, carbs: 0, fats: 0 }
        : undefined,
      entryType: entryType.value,
      date: new Date().toISOString(),
    };

    console.log('📤 Trimitere meal:', payload);

    // ✅ Use apiClient instead of axios directly
    await apiClient.post('/api/meals', payload);

    successMessage.value = `Intrare salvată cu succes: ${name.value}!`;

    // Clear form after 2 seconds
    setTimeout(() => {
      clearForm();
      emit('entry-saved');
    }, 2000);

  } catch (err: any) {
    console.error('❌ Eroare salvare meal:', err);

    if (err.code === 'ECONNABORTED') {
      error.value = 'Timeout: Serverul nu răspunde. Încearcă din nou.';
    } else if (err.code === 'ERR_NETWORK') {
      error.value = 'Eroare de conexiune. Verifică dacă serverul rulează.';
    } else if (err.response?.status === 401) {
      error.value = 'Sesiune expirată. Te rugăm să te autentifici din nou.';
    } else if (err.response?.status === 400) {
      error.value = err.response?.data?.message || 'Date invalide.';
    } else {
      error.value = err.response?.data?.message || 'Eroare la salvarea intrării.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="card">
    <h3 class="card-title">Adăugare Manuală</h3>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">Tip Intrare</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input type="radio" v-model="entryType" value="manual" style="accent-color: var(--blue);" />
            <span>Masă</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" v-model="entryType" value="exercise" style="accent-color: var(--red);" />
            <span>Exercițiu (Ars)</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="name" class="form-label">
          Nume (Ex: {{ entryType === 'exercise' ? 'Alergare, Înot' : 'Pizza, Salată' }})
        </label>
        <input id="name" type="text" v-model="name" required class="form-input"
          :placeholder="entryType === 'exercise' ? 'Ex: Alergare' : 'Ex: Pizza'" />
      </div>

      <div class="form-group">
        <label for="calories" class="form-label">
          Calorii
          <span :style="{ color: entryType === 'exercise' ? 'var(--red)' : 'var(--blue)' }">
            ({{ entryType === 'exercise' ? 'Arse (-)' : 'Consumate (+)' }})
          </span>
        </label>
        <input id="calories" type="number" v-model.number="calories" required min="1" class="form-input"
          :placeholder="entryType === 'exercise' ? 'Ex: 300' : 'Ex: 500'" />
      </div>

      <div v-if="error" class="alert alert-error">
        ❌ {{ error }}
      </div>

      <div v-if="successMessage" class="alert alert-success">
        ✅ {{ successMessage }}
      </div>

      <button type="submit" :disabled="isLoading || !name || calories <= 0" class="btn btn-full" :style="{
        backgroundColor: entryType === 'exercise' ? 'var(--red)' : 'var(--green)',
        color: 'white',
        opacity: (isLoading || !name || calories <= 0) ? 0.6 : 1,
        cursor: (isLoading || !name || calories <= 0) ? 'not-allowed' : 'pointer'
      }">
        {{ isLoading ? '🔄 Se Salvează...' : '✅ Adaugă' }}
      </button>
    </form>
  </div>
</template>