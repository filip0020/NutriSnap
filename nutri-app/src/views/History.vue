<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/utils/apiClient'; // ✅ USE apiClient instead of axios

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
    // ✅ FIXED: Use apiClient with /api prefix
    const response = await apiClient.get('/api/meals');
    entries.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Eroare la încărcarea istoricului. Asigură-te că ești logat.';
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('ro-RO', options);
};

onMounted(() => {
  fetchHistory();
});
</script>

<template>
  <div class="history">
    <h2 class="history__title">Istoric Jurnal Nutrițional</h2>

    <div v-if="isLoading" class="history__loading">Se încarcă intrările...</div>

    <div v-else-if="error" class="history__error">
      Eroare la încărcare: {{ error }}
    </div>

    <div v-else-if="entries.length === 0" class="history__empty">
      Nu ai înregistrat încă nicio masă sau exercițiu.
    </div>

    <div v-else class="history__entries">
      <div v-for="entry in entries" :key="entry._id"
        :class="['history__entry', entry.entryType === 'exercise' ? 'history__entry--exercise' : 'history__entry--meal']">

        <div class="history__entry-info">
          <span class="history__entry-name">{{ entry.name }}</span>
          <span class="history__entry-date">{{ formatDate(entry.date) }}</span>
          <span v-if="entry.entryType !== 'exercise'" class="history__entry-nutrients">
            P: {{ entry.nutrients.protein }}g | C: {{ entry.nutrients.carbs }}g | G: {{ entry.nutrients.fats }}g
          </span>
        </div>

        <div class="history__entry-calories">
          <span class="history__entry-value">{{ entry.entryType === 'exercise' ? '-' : '+' }}{{ entry.calories }}</span>
          <span class="history__entry-unit">Kcal</span>
          <span class="history__entry-type">
            {{ entry.entryType === 'manual' ? 'Masă' : entry.entryType === 'image_ai' ? 'Scanare AI' : 'Exercițiu' }}
          </span>
        </div>

      </div>
    </div>
  </div>
</template>