<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

interface Nutrients { protein: number; carbs: number; fats: number; }
interface AnalysisResult { mealName: string; calories: number; nutrients: Nutrients; }

const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const emit = defineEmits<{ (e: 'analysis-complete', result: AnalysisResult): void }>()

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files.item(0)!
  }
}

const analyzeImage = async () => {
  if (!selectedFile.value) return (error.value = 'Te rog selectează o imagine.')
  isLoading.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('foodImage', selectedFile.value)
    const { data } = await axios.post<AnalysisResult>('http://localhost:3000/api/ai/analyze-image', formData)
    emit('analysis-complete', data)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Eroare la analiza imaginii.'
  } finally {
    isLoading.value = false
    selectedFile.value = null
  }
}
</script>

<template>
  <div class="card">
    <h3 class="card-title">Scanare Hrană (AI)</h3>

    <input id="foodImageUpload" type="file" @change="handleFileUpload" accept="image/*" class="file-input" />

    <button @click="analyzeImage" :disabled="!selectedFile || isLoading" class="btn btn-primary btn-full">
      {{ isLoading ? 'Analizez imaginea...' : 'Analizează Imaginea' }}
    </button>

    <p v-if="error" class="alert alert-error" style="margin-top: 1rem;">
      {{ error }}
    </p>
  </div>
</template>