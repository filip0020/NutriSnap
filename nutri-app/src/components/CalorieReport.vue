<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  report: any;
  isDark: boolean;
}>();

const getStatusClass = computed(() => {
  if (!props.report) return '';
  if (props.report.status === 'deficit') return 'balance-deficit';
  if (props.report.status === 'surplus') return 'balance-surplus';
  return 'balance-perfect';
});

const getStatusText = computed(() => {
  if (!props.report) return 'Se încarcă...';
  if (props.report.status === 'deficit') return 'Mai ai de consumat';
  if (props.report.status === 'surplus') return 'Surplus caloric';
  return 'Perfect echilibrat';
});
</script>

<template>
  <div class="report-card">

    <div class="report-header">
      <h3 class="report-title">
        Balanță Calorii
      </h3>
      <svg style="width: 2rem; height: 2rem; color: var(--cyan);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <span style="font-size: 1.125rem; color: var(--text-secondary);">Kcal</span>
          <span class="status-badge" :class="getStatusClass">
            {{ getStatusText }}
          </span>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-container">
        <div class="stat-row">
          <span class="stat-label">
            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Țintă Zilnică
          </span>
          <span class="stat-value">{{ report.target }} Kcal</span>
        </div>

        <div class="stat-row">
          <span class="stat-label" style="color: var(--green);">
            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Consumat
          </span>
          <span class="stat-value" style="color: var(--green);">{{ report.totalConsumed }} Kcal</span>
        </div>

        <div class="stat-row">
          <span class="stat-label" style="color: var(--orange);">
            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Ars (Activitate)
          </span>
          <span class="stat-value" style="color: var(--orange);">{{ report.totalBurned }} Kcal</span>
        </div>

        <div class="stat-row" style="padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <span style="font-weight: 600;">Net Consumat</span>
          <span style="font-weight: 900; font-size: 1.25rem;">{{ report.netCalories }} Kcal</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-container">
      <div class="spinner"></div>
    </div>
  </div>
</template>