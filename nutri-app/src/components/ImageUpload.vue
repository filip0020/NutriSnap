<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

interface Nutrients {
  protein: number;
  carbs: number;
  fats: number;
}

interface AnalysisResult {
  mealName: string;
  calories: number;
  nutrients: Nutrients;
}

const selectedFile = ref<File | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const emit = defineEmits<{
  (e: 'analysis-complete', result: AnalysisResult): void
}>();

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]!;
  }
};

const analyzeImage = async () => {
  if (!selectedFile.value) {
    error.value = 'Te rog selectează o imagine de trimis.';
    return;
  }

  isLoading.value = true;
  error.value = null;

  const formData = new FormData();
  formData.append('foodImage', selectedFile.value);

  try {
    const response = await axios.post<AnalysisResult>('http://localhost:3000/api/ai/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    emit('analysis-complete', response.data);

  } catch (err: any) {
    error.value = err.response?.data?.message || 'Eroare la analiza imaginii. Ești logat?';
  } finally {
    isLoading.value = false;
    selectedFile.value = null;
    const fileInput = document.getElementById('foodImageUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
};
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-lg border-2 border-dashed border-gray-300">
    <h3 class="text-xl font-semibold mb-4 text-center">Scanare Hrană (AI)</h3>

    <div class="mb-4">
      <input id="foodImageUpload" type="file" @change="handleFileUpload" accept="image/*"
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
    </div>

    <button @click="analyzeImage" :disabled="!selectedFile || isLoading"
      class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
      {{ isLoading ? 'Analizez Imaginea...' : 'Analizează Imaginea' }}
    </button>

    <div v-if="error" class="mt-4 text-red-600 bg-red-50 p-3 rounded text-sm">
      Eroare: {{ error }}
    </div>

  </div>
</template>