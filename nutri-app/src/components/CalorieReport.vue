<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  report: any;
  isDark: boolean;
}>();

const emit = defineEmits<{
  updateTarget: [value: number];
}>();

const isEditingTarget = ref(false);
const editTargetValue = ref(props.report?.target || 2000);

const getStatusClass = computed(() => {
  if (!props.report) return '';
  // Surplus = ai mâncat mai mult decât trebuie (balanta pozitivă)
  // Deficit = ai mâncat mai puțin decât trebuie (balanță negativă)
  if (props.report.balance < 0) return 'balance-deficit';
  if (props.report.balance > 0) return 'balance-surplus';
  return 'balance-perfect';
});

const getStatusText = computed(() => {
  if (!props.report) return 'Se încarcă...';
  if (props.report.balance < 0) return 'Mai ai de consumat';
  if (props.report.balance > 0) return 'Surplus caloric';
  return 'Perfect echilibrat';
});

const startEditingTarget = () => {
  editTargetValue.value = props.report?.target || 2000;
  isEditingTarget.value = true;
};

const saveTarget = () => {
  if (editTargetValue.value > 0) {
    emit('updateTarget', editTargetValue.value);
    isEditingTarget.value = false;
  }
};

const cancelEdit = () => {
  isEditingTarget.value = false;
  editTargetValue.value = props.report?.target || 2000;
};
</script>

<template>
  <div class="report-card">
    <div class="report-header">
      <h3 class="report-title">Balanță Calorii</h3>
      <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    </div>

    <div v-if="report">
      <!-- Balance Display -->
      <div class="balance-display">
        <div class="balance-value" :class="getStatusClass">
          {{ Math.abs(Math.round(report.balance)) }}
        </div>
        <div class="balance-label">
          <span class="balance-unit">Kcal</span>
          <span class="status-badge" :class="getStatusClass">
            {{ getStatusText }}
          </span>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-container">
        <div class="stat-row">
          <span class="stat-label">
            <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Țintă Zilnică
          </span>

          <div class="stat-value-group">
            <span v-if="!isEditingTarget" class="stat-value">{{ report.target }} Kcal</span>
            <input v-else v-model.number="editTargetValue" type="number" min="500" max="10000" class="target-input"
              @keyup.enter="saveTarget" @keyup.esc="cancelEdit" />

            <button v-if="!isEditingTarget" @click="startEditingTarget" class="edit-btn" title="Editează ținta">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <div v-else class="edit-actions">
              <button @click="saveTarget" class="save-btn" title="Salvează">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button @click="cancelEdit" class="cancel-btn" title="Anulează">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-label stat-label-green">
            <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Consumat
          </span>
          <span class="stat-value stat-value-green">{{ report.totalConsumed }} Kcal</span>
        </div>

        <div class="stat-row">
          <span class="stat-label stat-label-orange">
            <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Ars (Activitate)
          </span>
          <span class="stat-value stat-value-orange">{{ report.totalBurned }} Kcal</span>
        </div>

        <div class="stat-row stat-row-total">
          <span class="stat-label-bold">Net Consumat</span>
          <span class="stat-value-bold">{{ report.netCalories }} Kcal</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-container">
      <div class="spinner"></div>
    </div>
  </div>
</template>