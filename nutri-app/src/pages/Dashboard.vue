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

<style scoped lang="scss">
.dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  &__welcome {
    flex: 1;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }

  &__subtitle {
    color: var(--text-secondary);
    margin: 0;
  }

  &__logout-btn {
    padding: 0.75rem 1.5rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
  }

  &__period-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    background: var(--bg-secondary);
    padding: 0.5rem;
    border-radius: 0.75rem;
    width: fit-content;
  }

  &__period-btn {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: var(--text-secondary);
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    &--active {
      background: var(--cyan);
      color: white;

      &:hover {
        background: var(--cyan);
      }
    }
  }

  &__loading,
  &__error {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  &__error {
    p {
      margin-bottom: 1rem;
      font-size: 1.125rem;
    }
  }

  &__retry-btn {
    padding: 0.75rem 1.5rem;
    background: var(--cyan);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }

  &__summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  &__summary-card {
    background: var(--card-bg);
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: var(--shadow-md);
    transition: all 0.3s;

    &:hover {
      box-shadow: var(--shadow-lg);
    }

    &--editable {
      position: relative;
    }
  }

  &__summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  &__summary-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  &__summary-value {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-primary);
    margin: 0;

    &--surplus {
      color: var(--orange);
    }

    &--deficit {
      color: var(--cyan);
    }
  }

  &__summary-unit {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0 0;
  }

  &__summary-status {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.5rem 0 0 0;
    font-weight: 600;
  }

  &__edit-btn {
    padding: 0.375rem;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;

    svg {
      width: 1rem;
      height: 1rem;
    }

    &:hover {
      background: var(--bg-secondary);
      color: var(--cyan);
    }
  }

  &__edit-wrapper {
    position: relative;
  }

  &__target-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--cyan);
    border-radius: 0.5rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-weight: 900;
    font-size: 2rem;
    text-align: center;
    outline: none;
    margin-bottom: 0.5rem;

    &:focus {
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  &__edit-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;

    button {
      flex: 1;
      padding: 0.625rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 1.25rem;
        height: 1.25rem;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  &__save-btn {
    background: var(--green);
    color: white;

    &:hover:not(:disabled) {
      background: #16a34a;
    }
  }

  &__cancel-btn {
    background: var(--bg-secondary);
    color: var(--text-secondary);

    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
  }

  &__save-error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: center;
  }

  &__mini-spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  &__meals {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: var(--shadow-md);
  }

  &__meals-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1.5rem 0;
  }

  &__no-meals {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
  }

  &__meals-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__meal-entry {
    background: var(--bg-secondary);
    padding: 1.25rem;
    border-radius: 0.75rem;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-primary);
    }
  }

  &__meal-info {
    margin-bottom: 0.75rem;
  }

  &__meal-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.25rem 0;
  }

  &__meal-date {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  &__meal-calories {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
  }

  &__meal-type {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin-left: 0.5rem;
    padding: 0.25rem 0.625rem;
    background: var(--bg-primary);
    border-radius: 9999px;
  }

  &__meal-nutrients {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: var(--text-secondary);

    span {
      padding: 0.375rem 0.75rem;
      background: var(--bg-primary);
      border-radius: 0.375rem;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;

    &__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    &__title {
      font-size: 1.5rem;
    }

    &__summary-grid {
      grid-template-columns: 1fr;
    }

    &__period-selector {
      width: 100%;
      justify-content: space-between;
    }

    &__period-btn {
      flex: 1;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
    }
  }
}
</style>