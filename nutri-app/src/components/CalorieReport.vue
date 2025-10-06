<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  report: any; 
}>();

const statusClass = computed(() => {
    if (!props.report) return 'bg-gray-100';
    if (props.report.status === 'deficit') return 'bg-blue-100 border-blue-500';
    if (props.report.status === 'surplus') return 'bg-red-100 border-red-500';
    return 'bg-green-100 border-green-500';
});
</script>

<template>
  <div :class="['p-6 rounded-lg shadow-xl border-l-4', statusClass]">
    <h3 class="text-2xl font-bold mb-4 text-gray-800">Balanță Calorii Azi</h3>
    
    <div v-if="report">
        <p class="text-4xl font-extrabold mb-4" :class="report.status === 'deficit' ? 'text-blue-700' : report.status === 'surplus' ? 'text-red-700' : 'text-green-700'">
            {{ Math.round(report.balance) }} Kcal
        </p>
        <p class="text-sm text-gray-600 mb-6">
            {{ report.status === 'deficit' ? 'Mai ai de consumat.' : report.status === 'surplus' ? 'Ai un surplus caloric.' : 'Ești în limitele țintei.' }}
        </p>

        <div class="space-y-3 text-sm">
            <p><strong>Țintă Zilnică:</strong> {{ report.target }} Kcal</p>
            <p><strong>Consumat:</strong> {{ report.totalConsumed }} Kcal</p>
            <p><strong>Ars (Activitate + Bază):</strong> {{ report.totalBurned }} Kcal</p>
            <p class="pt-2 border-t font-semibold">Net Consumat: {{ report.netCalories }} Kcal</p>
        </div>
    </div>
    <div v-else class="text-gray-500">
        Se încarcă raportul sau nu ai înregistrări.
    </div>
  </div>
</template>