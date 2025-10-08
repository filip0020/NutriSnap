<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../store/authStore';
import { getMealReport } from '../services/mealService';
import type { MealReport } from '../services/mealService';

const authStore = useAuthStore();
const report = ref<MealReport | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const period = ref<'daily' | 'weekly' | 'monthly'>('daily');

const loadReport = async () => {
  try {
    loading.value = true;
    error.value = null;
    const data = await getMealReport(period.value);
    report.value = data;
  } catch (err: any) {
    console.error('Eroare la încărcare raport:', err);
    error.value = err.message || 'Eroare la încărcarea raportului';
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
};

const setPeriodAndLoad = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
  period.value = newPeriod;
};

onMounted(() => {
  loadReport();
});

watch(period, () => {
  loadReport();
});
</script>

<template>
  <div class="dashboard">

    <div class="dashboard__header">
      <div class="dashboard__welcome">
        <h1 class="dashboard__title">Dashboard NutriSnap</h1>
        <p class="dashboard__subtitle">Bine ai venit, {{ authStore.user?.email }}!</p>
      </div>
      <button @click="handleLogout" class="dashboard__logout-btn">Logout</button>
    </div>

    <div class="dashboard__period-selector">
      <button @click="setPeriodAndLoad('daily')"
        :class="['dashboard__period-btn', period === 'daily' ? 'dashboard__period-btn--active' : '']">Zilnic</button>
      <button @click="setPeriodAndLoad('weekly')"
        :class="['dashboard__period-btn', period === 'weekly' ? 'dashboard__period-btn--active' : '']">Săptămânal</button>
      <button @click="setPeriodAndLoad('monthly')"
        :class="['dashboard__period-btn', period === 'monthly' ? 'dashboard__period-btn--active' : '']">Lunar</button>
    </div>

    <div v-if="loading" class="dashboard__loading">Se încarcă raportul...</div>

    <div v-else-if="error" class="dashboard__error">
      <p>⚠️ {{ error }}</p>
      <button @click="loadReport" class="dashboard__retry-btn">Încearcă din nou</button>
    </div>

    <div v-else-if="report" class="dashboard__content">

      <div class="dashboard__summary-grid">
        <div class="dashboard__summary-card">
          <h3 class="dashboard__summary-label">Target</h3>
          <p class="dashboard__summary-value">{{ report.summary.target }}</p>
          <p class="dashboard__summary-unit">kcal</p>
        </div>

        <div class="dashboard__summary-card">
          <h3 class="dashboard__summary-label">Consumat</h3>
          <p class="dashboard__summary-value">{{ report.summary.totalConsumed }}</p>
          <p class="dashboard__summary-unit">kcal</p>
        </div>

        <div class="dashboard__summary-card">
          <h3 class="dashboard__summary-label">Ars</h3>
          <p class="dashboard__summary-value">{{ report.summary.totalBurned }}</p>
          <p class="dashboard__summary-unit">kcal</p>
        </div>

        <div class="dashboard__summary-card">
          <h3 class="dashboard__summary-label">Balanță</h3>
          <p :class="['dashboard__summary-value',
            report.summary.status === 'surplus' ? 'dashboard__summary-value--surplus' :
              report.summary.status === 'deficit' ? 'dashboard__summary-value--deficit' : '']">
            {{ report.summary.balance > 0 ? '+' : '' }}{{ report.summary.balance }}
          </p>
          <p class="dashboard__summary-status">{{ report.summary.status }}</p>
        </div>
      </div>

      <div class="dashboard__meals">
        <h2 class="dashboard__meals-title">Mese înregistrate</h2>

        <p v-if="report.meals.length === 0" class="dashboard__no-meals">
          Nicio masă înregistrată pentru această perioadă
        </p>

        <div v-else class="dashboard__meals-list">
          <div v-for="meal in report.meals" :key="meal._id" class="dashboard__meal-entry">
            <div class="dashboard__meal-info">
              <h3 class="dashboard__meal-name">{{ meal.name }}</h3>
              <p class="dashboard__meal-date">
                {{ new Date(meal.date).toLocaleDateString('ro-RO', {
                  day: 'numeric', month: 'long', hour: '2-digit',
                  minute: '2-digit'
                }) }}
              </p>
            </div>
            <div class="dashboard__meal-calories">
              {{ meal.entryType === 'exercise' ? '-' : '+' }}{{ meal.calories }} kcal
              <span class="dashboard__meal-type">
                {{ meal.entryType === 'manual' ? 'Manual' : meal.entryType === 'image_ai' ? 'AI' : 'Exercițiu' }}
              </span>
            </div>
            <div v-if="meal.entryType !== 'exercise'" class="dashboard__meal-nutrients">
              <span>🥩 Proteine: {{ meal.nutrients.protein }}g</span>
              <span>🍞 Carbohidrați: {{ meal.nutrients.carbs }}g</span>
              <span>🧈 Grăsimi: {{ meal.nutrients.fats }}g</span>
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
/* Clase BEM pentru stilizare ulterioară */
</style>
