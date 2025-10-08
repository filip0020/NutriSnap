<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

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
      calories: calories.value,
      nutrients: entryType.value === 'manual' ? { protein: 0, carbs: 0, fats: 0 } : undefined,
      entryType: entryType.value,
      date: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/api/meals', payload);

    successMessage.value = `Intrare salvată cu succes: ${name.value}!`;
    clearForm();
    emit('entry-saved');

  } catch (err: any) {
    error.value = err.response?.data?.message || 'Eroare la salvarea intrării.';
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
        <label for="name" class="form-label">Nume (Ex: Pizza, Alergare)</label>
        <input id="name" type="text" v-model="name" required class="form-input" />
      </div>

      <div class="form-group">
        <label for="calories" class="form-label">
          Calorii
          <span :style="{ color: entryType === 'exercise' ? 'var(--red)' : 'var(--blue)' }">
            ({{ entryType === 'exercise' ? 'Arse (-)' : 'Consumate (+)' }})
          </span>
        </label>
        <input id="calories" type="number" v-model.number="calories" required min="1" class="form-input" />
      </div>

      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <div v-if="successMessage" class="alert alert-success">
        {{ successMessage }}
      </div>

      <button type="submit" :disabled="isLoading" class="btn btn-full" :style="{
        backgroundColor: entryType === 'exercise' ? 'var(--red)' : 'var(--green)',
        color: 'white'
      }">
        {{ isLoading ? 'Se Salvează...' : 'Adaugă' }}
      </button>
    </form>
  </div>
</template>