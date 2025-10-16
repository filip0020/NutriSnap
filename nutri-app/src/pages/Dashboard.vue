<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../store/authStore';
import { getMealReport } from '../services/mealService';
import type { MealReport } from '../services/mealService';
import apiClient from '@/utils/apiClient';

const authStore = useAuthStore();
const report = ref<MealReport | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const period = ref<'daily' | 'weekly' | 'monthly'>('daily');

// Edit target state
const isEditingTarget = ref(false);
const editTargetValue = ref(2000);
const isSavingTarget = ref(false);
const saveError = ref('');

const loadReport = async () => {
  try {
    loading.value = true;
    error.value = null;
    const data = await getMealReport(period.value);
    report.value = data;

    // Update edit target value when report loads
    if (data?.summary?.target) {
      editTargetValue.value = data.summary.target;
    }
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

// Edit target functions
const startEditingTarget = () => {
  editTargetValue.value = report.value?.summary?.target || 2000;
  isEditingTarget.value = true;
  saveError.value = '';
};

const saveTarget = async () => {
  if (editTargetValue.value < 500 || editTargetValue.value > 10000) {
    saveError.value = 'Ținta trebuie să fie între 500 și 10000 calorii';
    return;
  }

  isSavingTarget.value = true;
  saveError.value = '';

  try {
    console.log('🔄 Se trimite request pentru actualizare țintă:', editTargetValue.value);

    // Update în backend
    const response = await apiClient.put('/api/auth/profile', {
      caloriesTarget: editTargetValue.value
    });

    console.log('✅ Response de la server:', response.data);

    // Update user în store
    if (authStore.user) {
      authStore.user.caloriesTarget = editTargetValue.value;
      localStorage.setItem('user', JSON.stringify(authStore.user));
    }

    // Refresh raportul
    await loadReport();

    isEditingTarget.value = false;
    console.log('✅ Ținta calorică actualizată cu succes:', editTargetValue.value);
  } catch (err: any) {
    console.error('❌ Eroare completă:', err);
    console.error('❌ Response data:', err.response?.data);
    console.error('❌ Status:', err.response?.status);
    console.error('❌ Headers:', err.response?.headers);

    const errorMessage = err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Nu s-a putut actualiza ținta calorică';

    saveError.value = errorMessage;
    alert(`Eroare la salvare: ${errorMessage}\n\nStatus: ${err.response?.status}\nDetalii complete în console`);
  } finally {
    isSavingTarget.value = false;
  }
};

const cancelEdit = () => {
  isEditingTarget.value = false;
  editTargetValue.value = report.value?.summary?.target || 2000;
  saveError.value = '';
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
        <!-- Target Card with Edit -->
        <div class="dashboard__summary-card dashboard__summary-card--editable">
          <div class="dashboard__summary-header">
            <h3 class="dashboard__summary-label">Target</h3>
            <button v-if="!isEditingTarget" @click="startEditingTarget" class="dashboard__edit-btn"
              title="Editează ținta">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

          <div v-if="!isEditingTarget">
            <p class="dashboard__summary-value">{{ report.summary.target }}</p>
            <p class="dashboard__summary-unit">kcal</p>
          </div>

          <div v-else class="dashboard__edit-wrapper">
            <input v-model.number="editTargetValue" type="number" min="500" max="10000" class="dashboard__target-input"
              :disabled="isSavingTarget" @keyup.enter="saveTarget" @keyup.esc="cancelEdit" />
            <p class="dashboard__summary-unit">kcal</p>

            <div class="dashboard__edit-actions">
              <button @click="saveTarget" class="dashboard__save-btn" :disabled="isSavingTarget" title="Salvează">
                <svg v-if="!isSavingTarget" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div v-else class="dashboard__mini-spinner"></div>
              </button>
              <button @click="cancelEdit" class="dashboard__cancel-btn" :disabled="isSavingTarget" title="Anulează">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p v-if="saveError" class="dashboard__save-error">{{ saveError }}</p>
          </div>
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
            report.summary.balance > 0 ? 'dashboard__summary-value--surplus' :
              report.summary.balance < 0 ? 'dashboard__summary-value--deficit' : '']">
            {{ report.summary.balance > 0 ? '+' : '' }}{{ report.summary.balance }}
          </p>
          <p class="dashboard__summary-status">
            {{ report.summary.balance < 0 ? 'Mai ai de consumat' : report.summary.balance > 0 ? 'Surplus caloric' :
              'Perfect echilibrat' }}
          </p>
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