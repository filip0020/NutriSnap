<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import CalorieReport from '../components/CalorieReport.vue';
import ImageUpload from '../components/ImageUpload.vue';
import ManualEntry from '../components/ManualEntry.vue';
import { Moon, Sun } from 'lucide-vue-next'

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

const isDark = ref(true);
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

        await apiClient.post('/meals', payload);
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
        const response = await apiClient.get('/meals/report?period=daily');
        reportData.value = response.data.summary;
    } catch (error) {
        console.error("Eroare la extragerea raportului:", error);
    }
};

const handleEntrySaved = () => {
    fetchDailyReport();
};

const totalMacros = computed(() => {
    if (!analysisResult.value) return 0;
    return analysisResult.value.nutrients.protein +
        analysisResult.value.nutrients.carbs +
        analysisResult.value.nutrients.fats;
});

const getCircleOffset = (value: number) => {
    const percentage = (value / totalMacros.value) * 100;
    const circumference = 2 * Math.PI * 45;
    return circumference - (percentage / 100) * circumference;
};

onMounted(() => {
    fetchDailyReport();
});
</script>

<template>
    <div class="home">
        <div class="home__bg-grid"></div>

        <div class="home__animated-bg">
            <div class="blob blob--1"></div>
            <div class="blob blob--2"></div>
        </div>


        <div class="home__container">

            <div class="home__header">
                <h1 class="home__title">Panou Nutrițional Zilnic</h1>
                <p class="home__subtitle">Monitorizează-ți sănătatea cu AI</p>
            </div>

            <div class="home__grid">

                <div class="home__column home__column--report">
                    <CalorieReport :report="reportData" :isDark="isDark" />
                </div>

                <div class="home__column home__column--main">

                    <div v-if="!analysisResult" class="home__input-grid">
                        <ImageUpload @analysis-complete="handleAnalysisComplete" :isDark="isDark" />
                        <ManualEntry @entry-saved="handleEntrySaved" :isDark="isDark" />
                    </div>

                    <div v-else class="analysis">

                        <div class="analysis__header">
                            <div class="analysis__title-wrapper">
                                <div class="analysis__icon-wrapper">
                                    <svg class="analysis__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div class="analysis__title-text">
                                    <h3 class="analysis__meal-name">Analiză AI Completă</h3>
                                    <p class="analysis__subtitle">Rezultat procesat</p>
                                </div>
                            </div>
                            <button @click="analysisResult = null" class="analysis__close-btn">×</button>
                        </div>

                        <div class="analysis__meal-info">
                            <p class="analysis__meal-label">Masă Identificată</p>
                            <h4 class="analysis__meal-name">{{ analysisResult.mealName }}</h4>
                            <div class="analysis__calories">
                                {{ analysisResult.calories }}
                                <span class="analysis__calories-unit">Kcal</span>
                            </div>
                        </div>

                        <div class="analysis__macros">
                            <p class="analysis__macros-title">Compoziție Macronutrienți</p>

                            <div class="macro macro--protein">
                                <div class="macro__circle-wrapper">
                                    <svg class="macro__circle-svg">
                                        <circle cx="56" cy="56" r="45" class="macro__circle-bg" />
                                        <circle cx="56" cy="56" r="45" class="macro__circle-progress"
                                            :stroke-dasharray="2 * Math.PI * 45"
                                            :stroke-dashoffset="getCircleOffset(analysisResult.nutrients.protein)" />
                                    </svg>
                                    <div class="macro__text">
                                        <span class="macro__value">{{ analysisResult.nutrients.protein }}</span>
                                        <span class="macro__unit">g</span>
                                    </div>
                                </div>
                                <div class="macro__label">Proteine</div>
                            </div>

                            <div class="macro macro--carbs">
                                <div class="macro__circle-wrapper">
                                    <svg class="macro__circle-svg">
                                        <circle cx="56" cy="56" r="45" class="macro__circle-bg" />
                                        <circle cx="56" cy="56" r="45" class="macro__circle-progress"
                                            :stroke-dasharray="2 * Math.PI * 45"
                                            :stroke-dashoffset="getCircleOffset(analysisResult.nutrients.carbs)" />
                                    </svg>
                                    <div class="macro__text">
                                        <span class="macro__value">{{ analysisResult.nutrients.carbs }}</span>
                                        <span class="macro__unit">g</span>
                                    </div>
                                </div>
                                <div class="macro__label">Carbohidrați</div>
                            </div>

                            <div class="macro macro--fats">
                                <div class="macro__circle-wrapper">
                                    <svg class="macro__circle-svg">
                                        <circle cx="56" cy="56" r="45" class="macro__circle-bg" />
                                        <circle cx="56" cy="56" r="45" class="macro__circle-progress"
                                            :stroke-dasharray="2 * Math.PI * 45"
                                            :stroke-dashoffset="getCircleOffset(analysisResult.nutrients.fats)" />
                                    </svg>
                                    <div class="macro__text">
                                        <span class="macro__value">{{ analysisResult.nutrients.fats }}</span>
                                        <span class="macro__unit">g</span>
                                    </div>
                                </div>
                                <div class="macro__label">Grăsimi</div>
                            </div>

                        </div>

                        <div v-if="saveError" class="alert alert--error">{{ saveError }}</div>

                        <button @click="saveMeal('image_ai')" :disabled="savingMeal" class="btn btn--full">
                            <span>{{ savingMeal ? 'Se Salvează...' : 'Adaugă la Jurnal (AI)' }}</span>
                        </button>

                    </div>

                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
