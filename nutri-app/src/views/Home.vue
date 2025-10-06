<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import ImageUpload from '../components/ImageUpload.vue'; 
import CalorieReport from '../components/CalorieReport.vue'; 
import ManualEntry from '../components/ManualEntry.vue';

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

const analysisResult = ref<AnalysisResult | null>(null);
const savingMeal = ref(false);
const saveError = ref<string | null>(null);
const reportData = ref(null);

const handleAnalysisComplete = (result: AnalysisResult) => {
  analysisResult.value = result;
  saveError.value = null;
};

const saveMeal = async (type: 'manual' | 'image_ai') => {
    if (!analysisResult.value) return;

    savingMeal.value = true;
    saveError.value = null;

    try {
        const payload = {
            name: analysisResult.value.mealName,
            calories: analysisResult.value.calories,
            nutrients: analysisResult.value.nutrients,
            entryType: type,
        };

        await axios.post('http://localhost:3000/api/meals', payload);
        
        analysisResult.value = null; 
        await fetchDailyReport(); 

    } catch (err: any) {
        saveError.value = err.response?.data?.message || 'Eroare la salvarea mesei.';
    } finally {
        savingMeal.value = false;
    }
};

const fetchDailyReport = async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/meals/report?period=daily');
        reportData.value = response.data.summary;
    } catch (error) {
        console.error("Eroare la extragerea raportului:", error);
    }
};

const handleEntrySaved = () => {
    fetchDailyReport();
};

onMounted(() => {
    fetchDailyReport();
});

</script>

<template>
  <div class="p-8">
    <h2 class="text-4xl font-extrabold mb-8 text-gray-800">Panou Nutrițional Zilnic</h2>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <CalorieReport :report="reportData" class="lg:col-span-1" />
        
        <div class="lg:col-span-2">

            <div v-if="!analysisResult" class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageUpload @analysis-complete="handleAnalysisComplete" />
                <ManualEntry @entry-saved="handleEntrySaved" /> 
            </div>

            <div v-else class="bg-green-50 border-l-4 border-green-500 text-gray-800 p-6 shadow-xl rounded-lg">
                <h3 class="text-2xl font-bold mb-4 flex justify-between items-center">
                    <span>Rezultat Analiză AI:</span>
                    <button @click="analysisResult = null" class="text-sm text-gray-500 hover:text-gray-700">X</button>
                </h3>

                <p class="mb-2 text-lg"><strong>Masa Identificată:</strong> {{ analysisResult.mealName }}</p>
                <p class="mb-4 text-5xl font-extrabold text-green-800">{{ analysisResult.calories }} <span class="text-lg font-normal">Kcal</span></p>

                <div class="grid grid-cols-3 gap-4 text-center mt-6 pt-4 border-t border-green-200">
                     <div><span class="font-bold block">{{ analysisResult.nutrients.protein }}g</span> Proteine</div>
                     <div><span class="font-bold block">{{ analysisResult.nutrients.carbs }}g</span> Carbohidrați</div>
                     <div><span class="font-bold block">{{ analysisResult.nutrients.fats }}g</span> Grăsimi</div>
                </div>
                
                <div v-if="saveError" class="mt-4 text-red-600 text-center text-sm">{{ saveError }}</div>

                <button 
                    @click="saveMeal('image_ai')" 
                    :disabled="savingMeal"
                    class="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md transition duration-150"
                >
                    {{ savingMeal ? 'Se Salvează...' : 'Adaugă la Jurnal (AI)' }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>