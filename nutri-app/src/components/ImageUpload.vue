<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/utils/apiClient';

// Interfața pentru răspunsul de la Gemini
interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  weight_grams: number;
  ingredients: string[];
  description: string;
}

interface TotalNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
}

interface GeminiResponse {
  success: boolean;
  analysis: {
    items: FoodItem[];
    totalNutrition: TotalNutrition;
    confidence: 'high' | 'medium' | 'low';
    notes: string;
  };
  metadata: {
    usedAI: boolean;
    aiProvider: string;
    timestamp: string;
    warning?: string;
  };
}

// Props pentru dark mode
defineProps<{
  isDark: boolean;
}>();

// Emit pentru rezultat (adaptat la formatul vechi pentru compatibilitate)
const emit = defineEmits<{
  (e: 'analysis-complete', result: {
    mealName: string;
    calories: number;
    nutrients: {
      protein: number;
      carbs: number;
      fats: number;
    };
    weight?: number;
    confidence?: string;
    aiDescription?: string;
  }): void;
}>();

const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const analyzing = ref(false);
const error = ref<string | null>(null);
const detailedInfo = ref<string | null>(null);

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validare tip
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    error.value = 'Te rugăm să încarci o imagine (JPEG, PNG, WEBP)';
    return;
  }

  // Validare dimensiune
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'Imaginea este prea mare. Maxim 10MB.';
    return;
  }

  selectedFile.value = file;
  error.value = null;
  detailedInfo.value = null;

  // Preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const analyzeImage = async () => {
  if (!selectedFile.value) {
    error.value = 'Te rugăm să selectezi o imagine';
    return;
  }

  analyzing.value = true;
  error.value = null;
  detailedInfo.value = null;

  try {
    const formData = new FormData();
    formData.append('foodImage', selectedFile.value);

    console.log('📤 Trimitere imagine către Gemini AI...');

    const response = await apiClient.post<GeminiResponse>(
      '/api/ai/analyze-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 secunde pentru AI
      }
    );

    console.log('✅ Răspuns Gemini:', response.data);

    if (!response.data.success) {
      throw new Error('AI analysis failed');
    }

    const { analysis, metadata } = response.data;

    // Crează descriere detaliată
    const itemsDesc = analysis.items.map(item =>
      `${item.quantity}x ${item.name} (~${item.weight_grams}g)`
    ).join(', ');

    detailedInfo.value = `${itemsDesc}\nConfidence: ${analysis.confidence}\n${metadata.aiProvider}`;

    // Convertește răspunsul în formatul vechi pentru compatibilitate
    const firstItem = analysis.items[0];

    if (!firstItem) {
      throw new Error("AI nu a returnat niciun aliment.");
    }

    const result = {
      mealName: analysis.items.length > 1
        ? `${analysis.items.length} items: ${firstItem.name} + more`
        : firstItem.name,
      calories: analysis.totalNutrition.calories,
      nutrients: {
        protein: analysis.totalNutrition.protein,
        carbs: analysis.totalNutrition.carbs,
        fats: analysis.totalNutrition.fats
      },
      weight: analysis.items.reduce((sum, item) => sum + item.weight_grams, 0),
      confidence: analysis.confidence,
      aiDescription: `${itemsDesc}. ${analysis.notes}`
    };


    console.log('📊 Formatted result:', result);

    // Afișează warning dacă nu s-a folosit AI
    if (!metadata.usedAI && metadata.warning) {
      console.warn('⚠️', metadata.warning);
    }

    emit('analysis-complete', result);

    // Reset
    selectedFile.value = null;
    previewUrl.value = null;

  } catch (err: any) {
    console.error('❌ Eroare completă:', err);

    if (err.code === 'ECONNABORTED') {
      error.value = 'Timeout: Procesarea durează prea mult.';
    } else if (err.code === 'ERR_NETWORK') {
      error.value = 'Eroare de conexiune. Verifică dacă serverul rulează.';
    } else if (err.response?.status === 404) {
      error.value = 'Endpoint-ul /api/ai/analyze-image nu există.';
    } else if (err.response?.status === 500) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error || 'Eroare server';
      error.value = `Eroare AI: ${serverMsg}`;
    } else if (err.response?.status === 401) {
      error.value = 'Sesiune expirată. Te rugăm să te autentifici.';
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else if (err.message) {
      error.value = err.message;
    } else {
      error.value = 'Eroare necunoscută. Încearcă din nou.';
    }
  } finally {
    analyzing.value = false;
  }
};

const clearSelection = () => {
  selectedFile.value = null;
  previewUrl.value = null;
  error.value = null;
  detailedInfo.value = null;
};
</script>

<template>
  <div class="card">
    <div class="image-upload">
      <h3 class="image-upload__title">🤖 Analiză AI cu Google Gemini</h3>
      <p class="text-sm text-gray-500 mb-4">
        Detectează automat tipul, cantitatea și valorile nutriționale
      </p>

      <div v-if="!previewUrl" class="image-upload__dropzone">
        <input type="file" id="fileInput" accept="image/jpeg,image/jpg,image/png,image/webp" @change="handleFileSelect"
          class="image-upload__input" />
        <label for="fileInput" class="image-upload__label">
          <svg class="image-upload__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Click pentru a încărca imagine</span>
          <span class="image-upload__hint">JPEG, PNG, WEBP (max 10MB)</span>
        </label>
      </div>

      <div v-else class="image-upload__preview-container">
        <div class="image-upload__preview">
          <img :src="previewUrl" alt="Preview" class="image-upload__preview-img" />
          <button @click="clearSelection" class="image-upload__remove-btn" :disabled="analyzing" title="Remove image">
            ✕
          </button>
        </div>

        <button @click="analyzeImage" :disabled="analyzing" class="btn btn--primary btn--full">
          <span v-if="analyzing">🔄 Analizare în curs...</span>
          <span v-else>🤖 Analizează cu AI</span>
        </button>
      </div>

      <div v-if="error" class="alert alert--error">
        <strong>⚠️ Eroare:</strong> {{ error }}
      </div>

      <div v-if="detailedInfo && !analyzing" class="alert alert--info">
        <strong>✅ Detectat:</strong>
        <pre style="white-space: pre-wrap; margin-top: 0.5rem;">{{ detailedInfo }}</pre>
      </div>

      <div v-if="analyzing" class="image-upload__loading">
        <div class="spinner"></div>
        <p><strong>Se procesează cu Google Gemini AI...</strong></p>
        <p class="text-sm text-gray-500">
          Detectare automată a alimentelor, cantităților și nutrienților
        </p>
        <p class="text-xs text-gray-400 mt-2">
          Acest proces poate dura 10-30 secunde
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert {
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.alert--error {
  background-color: #fee;
  border: 1px solid #fcc;
  color: #c33;
}

.alert--info {
  background-color: #e7f3ff;
  border: 1px solid #b3d9ff;
  color: #004085;
}

.alert pre {
  font-size: 0.875rem;
  font-family: monospace;
}
</style>