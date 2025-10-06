<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();

interface UserProfile {
  email: string;
  caloriesTarget: number;
  activityLevel: number;
}

const userProfile = ref<UserProfile | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Câmpuri editabile pentru form
const targetInput = ref(0);
const activityInput = ref(0);

const fetchProfile = async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await axios.get('http://localhost:3000/api/users/profile');
        userProfile.value = response.data;
        
        // Sincronizăm form-ul cu datele curente
        targetInput.value = userProfile.value!.caloriesTarget;
        activityInput.value = userProfile.value!.activityLevel;

    } catch (err: any) {
        error.value = err.response?.data?.message || 'Nu s-a putut încărca profilul.';
    } finally {
        isLoading.value = false;
    }
};

const updateProfile = async () => {
    isSaving.value = true;
    error.value = null;
    successMessage.value = null;

    try {
        const payload = {
            caloriesTarget: targetInput.value,
            activityLevel: activityInput.value
        };

        const response = await axios.put('http://localhost:3000/api/users/profile', payload);
        
        userProfile.value = response.data;
        successMessage.value = 'Profil actualizat cu succes!';

    } catch (err: any) {
        error.value = err.response?.data?.message || 'Eroare la salvarea modificărilor.';
    } finally {
        isSaving.value = false;
    }
};

onMounted(() => {
    fetchProfile();
});
</script>

<template>
  <div class="max-w-xl mx-auto mt-10 p-8 bg-white shadow-xl rounded-lg">
    <h2 class="text-3xl font-bold mb-8 text-gray-800 text-center">Setări Profil & Obiective</h2>

    <div v-if="isLoading" class="text-center p-10 text-xl text-blue-600">
      Se încarcă datele...
    </div>

    <div v-else-if="userProfile">
        <div class="mb-8 p-4 bg-gray-50 rounded-lg">
            <p class="text-sm font-medium text-gray-500">Email:</p>
            <p class="text-lg font-semibold text-gray-800">{{ userProfile.email }}</p>
        </div>

        <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{{ error }}</div>
        <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{{ successMessage }}</div>

        <form @submit.prevent="updateProfile">
            <div class="mb-6">
                <label for="target" class="block text-gray-700 text-sm font-bold mb-2">Ținta Calorii Zilnice (Kcal)</label>
                <input 
                    id="target" 
                    type="number" 
                    v-model.number="targetInput" 
                    required 
                    min="500"
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
                />
            </div>
            
            <div class="mb-8">
                <label for="activity" class="block text-gray-700 text-sm font-bold mb-2">Calorii Arse (Activitate de Bază/BMR)</label>
                <input 
                    id="activity" 
                    type="number" 
                    v-model.number="activityInput" 
                    required 
                    min="0"
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button 
                type="submit" 
                :disabled="isSaving"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 disabled:opacity-50"
            >
                {{ isSaving ? 'Se Salvează...' : 'Actualizează Profilul' }}
            </button>
        </form>

        <div class="mt-8 pt-4 border-t border-gray-200">
            <button 
                @click="authStore.logout" 
                class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150"
            >
                Delogare
            </button>
        </div>
    </div>
  </div>
</template>