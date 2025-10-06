<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

interface Nutrients {
  protein: number;
  carbs: number;
  fats: number;
}

interface MealEntry {
  _id: string;
  name: string;
  calories: number;
  nutrients: Nutrients;
  date: string;
  entryType: 'manual' | 'image_ai' | 'exercise';
}

const entries = ref<MealEntry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

const fetchHistory = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    // Apel către ruta protejată: GET /api/meals
    const response = await axios.get('http://localhost:3000/api/meals');
    entries.value = response.data;

  } catch (err: any) {
    error.value = err.response?.data?.message || 'Eroare la încărcarea istoricului. Asigură-te că ești logat.';
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('ro-RO', options);
};

onMounted(() => {
  fetchHistory();
});
</script>

<template>
  <div class="p-8">
    <h2 class="text-4xl font-extrabold mb-8 text-gray-800">Istoric Jurnal Nutrițional</h2>
    
    <div v-if="isLoading" class="text-center p-10 text-xl text-blue-600">
      Se încarcă intrările...
    </div>

    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      Eroare la încărcare: {{ error }}
    </div>

    <div v-else-if="entries.length === 0" class="bg-yellow-100 border border-yellow-400 text-yellow-700 p-6 rounded-lg text-center">
      Nu ai înregistrat încă nicio masă sau exercițiu.
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="entry in entries" 
        :key="entry._id"
        :class="['p-4 rounded-lg shadow-md flex justify-between items-center', entry.entryType === 'exercise' ? 'bg-red-50 border-r-4 border-red-500' : 'bg-green-50 border-r-4 border-green-500']"
      >
        <div class="flex flex-col">
          <span class="text-lg font-semibold">{{ entry.name }}</span>
          <span class="text-xs text-gray-500">{{ formatDate(entry.date) }}</span>
          <span v-if="entry.entryType !== 'exercise'" class="text-xs text-gray-600 mt-1">
            P: {{ entry.nutrients.protein }}g | C: {{ entry.nutrients.carbs }}g | G: {{ entry.nutrients.fats }}g
          </span>
        </div>
        
        <div class="text-right">
          <span 
            :class="['text-2xl font-bold', entry.entryType === 'exercise' ? 'text-red-700' : 'text-green-700']"
          >
            {{ entry.entryType === 'exercise' ? '-' : '+' }}{{ entry.calories }}
          </span>
          <span class="text-sm text-gray-500 block">Kcal</span>
          <span class="text-xs mt-1" :class="entry.entryType === 'exercise' ? 'text-red-500' : 'text-green-500'">
            {{ entry.entryType === 'manual' ? 'Masă' : entry.entryType === 'image_ai' ? 'Scanare AI' : 'Exercițiu' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>