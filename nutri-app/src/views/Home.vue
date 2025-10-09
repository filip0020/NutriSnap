<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import CalorieReport from '../components/CalorieReport.vue';
import ImageUpload from '../components/ImageUpload.vue';
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
    aiDescription?: string;
    imageUrl?: string;
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

// Calculăm procentajele pentru pie chart
const macroPercentages = computed(() => {
    if (!analysisResult.value) return { protein: 0, carbs: 0, fats: 0 };

    const total = analysisResult.value.nutrients.protein +
        analysisResult.value.nutrients.carbs +
        analysisResult.value.nutrients.fats;

    if (total === 0) return { protein: 33, carbs: 33, fats: 34 };

    return {
        protein: Math.round((analysisResult.value.nutrients.protein / total) * 100),
        carbs: Math.round((analysisResult.value.nutrients.carbs / total) * 100),
        fats: Math.round((analysisResult.value.nutrients.fats / total) * 100)
    };
});

// Generăm path-urile pentru SVG pie chart
const getPieSlices = computed(() => {
    if (!analysisResult.value) return [];

    const percentages = macroPercentages.value;
    const total = percentages.protein + percentages.carbs + percentages.fats;

    // Ajustăm pentru a avea exact 100%
    const protein = (percentages.protein / total) * 100;
    const carbs = (percentages.carbs / total) * 100;
    const fats = (percentages.fats / total) * 100;

    let currentAngle = 0;
    const slices = [];

    const createSlice = (percentage: number, color: string, label: string) => {
        const angle = (percentage / 100) * 360;
        const endAngle = currentAngle + angle;

        const startX = 50 + 45 * Math.cos((currentAngle - 90) * Math.PI / 180);
        const startY = 50 + 45 * Math.sin((currentAngle - 90) * Math.PI / 180);
        const endX = 50 + 45 * Math.cos((endAngle - 90) * Math.PI / 180);
        const endY = 50 + 45 * Math.sin((endAngle - 90) * Math.PI / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const path = `M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

        currentAngle = endAngle;

        return { path, color, percentage: Math.round(percentage), label };
    };

    slices.push(createSlice(protein, '#3b82f6', 'Proteine'));
    slices.push(createSlice(carbs, '#eab308', 'Carbohidrați'));
    slices.push(createSlice(fats, '#ef4444', 'Grăsimi'));

    return slices;
});

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

                    <!-- Rezultat AI Redesigned -->
                    <div v-else class="ai-result">
                        <div class="ai-result__header">
                            <div class="ai-result__badge">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span>Analiză AI</span>
                            </div>
                            <button @click="analysisResult = null" class="ai-result__close">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div class="ai-result__content">
                            <!-- Meal Info -->
                            <div class="meal-info">
                                <div class="meal-info__icon">🍽️</div>
                                <div class="meal-info__details">
                                    <h3 class="meal-info__name">{{ analysisResult.mealName }}</h3>
                                    <p v-if="analysisResult.aiDescription" class="meal-info__description">
                                        {{ analysisResult.aiDescription }}
                                    </p>
                                </div>
                                <div class="meal-info__calories">
                                    <div class="calories-value">{{ analysisResult.calories }}</div>
                                    <div class="calories-label">kcal</div>
                                </div>
                            </div>

                            <!-- Pie Chart + Stats -->
                            <div class="nutrition-display">
                                <div class="pie-chart-section">
                                    <h4 class="section-title">Compoziție Macronutrienți</h4>

                                    <svg viewBox="0 0 100 100" class="pie-chart">
                                        <circle cx="50" cy="50" r="45" fill="var(--bg-tertiary)" />
                                        <g v-for="(slice, index) in getPieSlices" :key="index">
                                            <path :d="slice.path" :fill="slice.color" class="pie-slice"
                                                :style="{ animationDelay: `${index * 0.1}s` }" />
                                        </g>
                                        <circle cx="50" cy="50" r="20" fill="var(--bg-secondary)" />
                                    </svg>

                                    <div class="pie-legend">
                                        <div class="legend-item">
                                            <div class="legend-dot" style="background: #3b82f6;"></div>
                                            <span>Proteine</span>
                                            <strong>{{ macroPercentages.protein }}%</strong>
                                        </div>
                                        <div class="legend-item">
                                            <div class="legend-dot" style="background: #eab308;"></div>
                                            <span>Carbohidrați</span>
                                            <strong>{{ macroPercentages.carbs }}%</strong>
                                        </div>
                                        <div class="legend-item">
                                            <div class="legend-dot" style="background: #ef4444;"></div>
                                            <span>Grăsimi</span>
                                            <strong>{{ macroPercentages.fats }}%</strong>
                                        </div>
                                    </div>
                                </div>

                                <div class="macro-stats">
                                    <h4 class="section-title">Detalii Nutriționale</h4>

                                    <div class="stat-card stat-card--protein">
                                        <div class="stat-card__icon">💪</div>
                                        <div class="stat-card__content">
                                            <div class="stat-card__label">Proteine</div>
                                            <div class="stat-card__value">{{ analysisResult.nutrients.protein }}g</div>
                                        </div>
                                        <div class="stat-card__bar">
                                            <div class="stat-bar"
                                                :style="{ width: macroPercentages.protein + '%', background: '#3b82f6' }">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="stat-card stat-card--carbs">
                                        <div class="stat-card__icon">🌾</div>
                                        <div class="stat-card__content">
                                            <div class="stat-card__label">Carbohidrați</div>
                                            <div class="stat-card__value">{{ analysisResult.nutrients.carbs }}g</div>
                                        </div>
                                        <div class="stat-card__bar">
                                            <div class="stat-bar"
                                                :style="{ width: macroPercentages.carbs + '%', background: '#eab308' }">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="stat-card stat-card--fats">
                                        <div class="stat-card__icon">🥑</div>
                                        <div class="stat-card__content">
                                            <div class="stat-card__label">Grăsimi</div>
                                            <div class="stat-card__value">{{ analysisResult.nutrients.fats }}g</div>
                                        </div>
                                        <div class="stat-card__bar">
                                            <div class="stat-bar"
                                                :style="{ width: macroPercentages.fats + '%', background: '#ef4444' }">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Info Box -->
                            <div class="info-box">
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clip-rule="evenodd" />
                                </svg>
                                <p>
                                    Rezultatele sunt estimate de AI și pot varia. Pentru informații nutriționale exacte,
                                    verifică ambalajul produsului sau consultă un nutriționist.
                                </p>
                            </div>

                            <!-- Error Message -->
                            <div v-if="saveError" class="alert alert-error">
                                {{ saveError }}
                            </div>

                            <!-- Action Buttons -->
                            <div class="ai-result__actions">
                                <button @click="saveMeal('image_ai')" :disabled="savingMeal"
                                    class="btn btn-gradient btn-full">
                                    {{ savingMeal ? '💾 Se Salvează...' : '✅ Adaugă la Jurnal' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>