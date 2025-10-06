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
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-6xl mx-auto">

      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard NutriSnap</h1>
            <p class="text-gray-600 mt-1">Bine ai venit, {{ authStore.user?.email }}!</p>
          </div>
          <button @click="handleLogout" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
            Logout
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex gap-4">
          <button @click="setPeriodAndLoad('daily')" :class="[
            'px-4 py-2 rounded-lg transition',
            period === 'daily'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
          ]">
            Zilnic
          </button>
          <button @click="setPeriodAndLoad('weekly')" :class="[
            'px-4 py-2 rounded-lg transition',
            period === 'weekly'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
          ]">
            Săptămânal
          </button>
          <button @click="setPeriodAndLoad('monthly')" :class="[
            'px-4 py-2 rounded-lg transition',
            period === 'monthly'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
          ]">
            Lunar
          </button>
        </div>
      </div>

      <div v-if="loading" class="bg-white rounded-lg shadow p-12 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Se încarcă raportul...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-700">⚠️ {{ error }}</p>
        <button @click="loadReport" class="mt-2 text-red-600 hover:text-red-800 font-medium">
          Încearcă din nou
        </button>
      </div>

      <div v-else-if="report">

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-500">Target</h3>
            <p class="text-3xl font-bold text-gray-900 mt-2">
              {{ report.summary.target }}
            </p>
            <p class="text-sm text-gray-500 mt-1">kcal</p>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-500">Consumat</h3>
            <p class="text-3xl font-bold text-green-600 mt-2">
              {{ report.summary.totalConsumed }}
            </p>
            <p class="text-sm text-gray-500 mt-1">kcal</p>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-500">Ars</h3>
            <p class="text-3xl font-bold text-orange-600 mt-2">
              {{ report.summary.totalBurned }}
            </p>
            <p class="text-sm text-gray-500 mt-1">kcal</p>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-500">Balanță</h3>
            <p :class="[
              'text-3xl font-bold mt-2',
              report.summary.status === 'surplus' ? 'text-red-600' :
                report.summary.status === 'deficit' ? 'text-blue-600' :
                  'text-gray-600'
            ]">
              {{ report.summary.balance > 0 ? '+' : '' }}{{ report.summary.balance }}
            </p>
            <p class="text-sm text-gray-500 mt-1 capitalize">
              {{ report.summary.status }}
            </p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b">
            <h2 class="text-xl font-bold text-gray-900">Mese înregistrate</h2>
          </div>

          <div class="p-6">
            <p v-if="report.meals.length === 0" class="text-gray-500 text-center py-8">
              Nicio masă înregistrată pentru această perioadă
            </p>

            <div v-else class="space-y-4">
              <div v-for="meal in report.meals" :key="meal._id"
                class="border rounded-lg p-4 hover:bg-gray-50 transition">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-semibold text-gray-900">{{ meal.name }}</h3>
                    <p class="text-sm text-gray-500">
                      {{ new Date(meal.date).toLocaleDateString('ro-RO', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p :class="[
                      'text-lg font-bold',
                      meal.entryType === 'exercise' ? 'text-orange-600' : 'text-green-600'
                    ]">
                      {{ meal.entryType === 'exercise' ? '-' : '+' }}{{ meal.calories }} kcal
                    </p>
                    <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {{ meal.entryType === 'manual' ? 'Manual' :
                        meal.entryType === 'image_ai' ? 'AI' :
                          'Exercițiu' }}
                    </span>
                  </div>
                </div>

                <div v-if="meal.entryType !== 'exercise'" class="mt-3 flex gap-4 text-sm text-gray-600">
                  <span>🥩 Proteine: {{ meal.nutrients.protein }}g</span>
                  <span>🍞 Carbohidrați: {{ meal.nutrients.carbs }}g</span>
                  <span>🧈 Grăsimi: {{ meal.nutrients.fats }}g</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped></style>