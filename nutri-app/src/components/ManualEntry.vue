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
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h3 class="text-xl font-semibold mb-4 text-gray-800">Adăugare Manuală</h3>

    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2">Tip Intrare</label>
        <div class="flex space-x-4">
          <label class="inline-flex items-center">
            <input type="radio" v-model="entryType" value="manual" class="form-radio text-blue-600" />
            <span class="ml-2">Masă</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" v-model="entryType" value="exercise" class="form-radio text-red-600" />
            <span class="ml-2">Exercițiu (Ars)</span>
          </label>
        </div>
      </div>

      <div class="mb-4">
        <label for="name" class="block text-gray-700 text-sm font-bold mb-2">Nume (Ex: Pizza, Alergare)</label>
        <input 
          id="name" 
          type="text" 
          v-model="name" 
          required 
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div class="mb-6">
        <label for="calories" class="block text-gray-700 text-sm font-bold mb-2">
          Calorii 
          <span :class="entryType === 'exercise' ? 'text-red-500' : 'text-blue-500'">
            ({{ entryType === 'exercise' ? 'Arse (-)' : 'Consumate (+)' }})
          </span>
        </label>
        <input 
          id="calories" 
          type="number" 
          v-model.number="calories" 
          required 
          min="1"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
        {{ error }}
      </div>
      
      <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
        {{ successMessage }}
      </div>
      
      <button 
        type="submit" 
        :disabled="isLoading"
        :class="['w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out disabled:opacity-50', entryType === 'exercise' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700']"
      >
        {{ isLoading ? 'Se Salvează...' : 'Adaugă' }}
      </button>
    </form>
  </div>
</template>