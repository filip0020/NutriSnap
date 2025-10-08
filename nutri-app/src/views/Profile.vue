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

const targetInput = ref(0);
const activityInput = ref(0);

const fetchProfile = async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await axios.get('http://localhost:3000/api/users/profile');
        userProfile.value = response.data;

        if (userProfile.value) {
            targetInput.value = userProfile.value.caloriesTarget;
            activityInput.value = userProfile.value.activityLevel;
        }

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
        const payload = { caloriesTarget: targetInput.value, activityLevel: activityInput.value };
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
    <div class="profile">

        <h2 class="profile__title">Setări Profil & Obiective</h2>

        <div v-if="isLoading" class="profile__loading">Se încarcă datele...</div>

        <div v-else-if="userProfile" class="profile__content">

            <div class="profile__email-block">
                <p class="profile__label">Email:</p>
                <p class="profile__email">{{ userProfile.email }}</p>
            </div>

            <div v-if="error" class="profile__error">{{ error }}</div>
            <div v-if="successMessage" class="profile__success">{{ successMessage }}</div>

            <form @submit.prevent="updateProfile" class="profile__form">
                <div class="profile__form-group">
                    <label for="target" class="profile__form-label">Ținta Calorii Zilnice (Kcal)</label>
                    <input id="target" type="number" v-model.number="targetInput" required min="500"
                        class="profile__form-input" />
                </div>

                <div class="profile__form-group">
                    <label for="activity" class="profile__form-label">Calorii Arse (BMR)</label>
                    <input id="activity" type="number" v-model.number="activityInput" required min="0"
                        class="profile__form-input" />
                </div>

                <button type="submit" :disabled="isSaving" class="profile__btn-submit">
                    {{ isSaving ? 'Se Salvează...' : 'Actualizează Profilul' }}
                </button>
            </form>

            <button @click="authStore.logout" class="profile__btn-logout">Delogare</button>

        </div>

    </div>
</template>

<style scoped>
/* Clase BEM pentru stilizare ulterioară */
</style>
