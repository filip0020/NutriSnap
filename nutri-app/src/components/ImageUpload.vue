<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/utils/apiClient';

interface AnalysisResult {
  mealName: string;
  calories: number;
  nutrients: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

defineProps<{
  isDark: boolean;
}>();

const emit = defineEmits<{
  (e: 'analysis-complete', result: AnalysisResult): void;
}>();

const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const analyzing = ref(false);
const error = ref<string | null>(null);

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validare tip fișier
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    error.value = 'Te rugăm să încarci o imagine (JPEG, PNG, WEBP)';
    return;
  }

  // Validare dimensiune (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'Imaginea este prea mare. Maxim 10MB.';
    return;
  }

  selectedFile.value = file;
  error.value = null;

  // Creare preview
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

  try {
    const formData = new FormData();
    formData.append('foodImage', selectedFile.value);

    console.log('📤 Trimitere imagine pentru analiză...');

    // IMPORTANT: Folosim /ai/analyze-image (nu /api/ai/analyze-image)
    const response = await apiClient.post<AnalysisResult>(
      '/ai/analyze-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 secunde timeout pentru procesarea AI
      }
    );

    console.log('✅ Analiză completă:', response.data);
    emit('analysis-complete', response.data);

    // Reset
    selectedFile.value = null;
    previewUrl.value = null;

  } catch (err: any) {
    console.error('❌ Eroare la analiză:', err);

    if (err.code === 'ECONNABORTED') {
      error.value = 'Timeout: Procesarea durează prea mult. Încearcă cu o imagine mai mică.';
    } else if (err.response?.status === 429) {
      error.value = 'Prea multe cereri. Așteaptă câteva momente.';
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else if (err.message?.includes('Network Error')) {
      error.value = 'Eroare de conexiune. Verifică conexiunea la internet.';
    } else {
      error.value = 'Eroare la analizarea imaginii. Te rugăm încearcă din nou.';
    }
  } finally {
    analyzing.value = false;
  }
};

const clearSelection = () => {
  selectedFile.value = null;
  previewUrl.value = null;
  error.value = null;
};
</script>

<template>
  <div class="image-upload">
    <h3 class="image-upload__title">📸 Analiză AI din Imagine</h3>

    <div v-if="!previewUrl" class="image-upload__dropzone">
      <input type="file" id="fileInput" accept="image/jpeg,image/jpg,image/png,image/webp" @change="handleFileSelect"
        class="image-upload__input" />
      <label for="fileInput" class="image-upload__label">
        <svg class="image-upload__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Click pentru a încărca o imagine</span>
        <span class="image-upload__hint">JPEG, PNG, WEBP (max 10MB)</span>
      </label>
    </div>

    <div v-else class="image-upload__preview-container">
      <div class="image-upload__preview">
        <img :src="previewUrl" alt="Preview" class="image-upload__preview-img" />
        <button @click="clearSelection" class="image-upload__remove-btn" :disabled="analyzing">
          ✕
        </button>
      </div>

      <button @click="analyzeImage" :disabled="analyzing" class="btn btn--primary btn--full">
        {{ analyzing ? '🔄 Analizare în curs...' : '🤖 Analizează cu AI' }}
      </button>
    </div>

    <div v-if="error" class="alert alert--error">
      {{ error }}
    </div>

    <div v-if="analyzing" class="image-upload__loading">
      <div class="spinner"></div>
      <p>Se procesează imaginea cu inteligență artificială...</p>
    </div>
  </div>
</template>

<style scoped>
.image-upload {
  padding: 1.5rem;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.image-upload__title {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.image-upload__dropzone {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
}

.image-upload__dropzone:hover {
  border-color: var(--primary);
  background: var(--hover-bg);
}

.image-upload__input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.image-upload__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.image-upload__icon {
  width: 48px;
  height: 48px;
  color: var(--primary);
}

.image-upload__hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.image-upload__preview-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.image-upload__preview {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.image-upload__preview-img {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
}

.image-upload__remove-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload__remove-btn:hover {
  background: rgba(255, 0, 0, 0.8);
}

.image-upload__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.alert--error {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn--primary {
  background: var(--primary);
  color: white;
}

.btn--full {
  width: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>