import apiClient from '../utils/apiClient';

export interface Nutrients {
  protein: number;
  carbs: number;
  fats: number;
}

export interface Meal {
  _id?: string;
  name: string;
  calories: number;
  nutrients: Nutrients;
  date: Date | string;
  entryType: 'manual' | 'image_ai' | 'exercise';
}

export interface MealReport {
  summary: {
    target: number;
    totalConsumed: number;
    totalBurned: number;
    netCalories: number;
    balance: number;
    status: 'surplus' | 'deficit' | 'maintenance';
  };
  meals: Meal[];
}

export const addMeal = async (meal: Meal): Promise<Meal> => {
  try {
    console.log('📤 Sending meal:', meal);

    // FIXED: Add /api prefix
    const response = await apiClient.post<Meal>('/api/meals', meal);

    console.log('✅ Meal added successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding meal:', error);

    // Better error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Server-ul nu răspunde. Încearcă din nou în câteva secunde.');
    }
    if (error.response?.status === 404) {
      throw new Error('Endpoint-ul nu a fost găsit. Verifică configurația API.');
    }
    if (error.response?.status === 401) {
      throw new Error('Nu ești autentificat. Te rugăm să te autentifici din nou.');
    }

    throw error;
  }
};

export const getMealReport = async (
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  date?: string
): Promise<MealReport> => {
  try {
    const params: any = { period };
    if (date) params.date = date;

    console.log('📤 Fetching meal report:', params);

    // FIXED: Add /api prefix
    const response = await apiClient.get<MealReport>('/api/meals/report', { params });

    console.log('✅ Report received:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching report:', error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Server-ul nu răspunde. Încearcă din nou în câteva secunde.');
    }
    if (error.response?.status === 404) {
      throw new Error('Endpoint-ul nu a fost găsit.');
    }
    if (error.response?.status === 401) {
      throw new Error('Nu ești autentificat.');
    }

    throw error;
  }
};

// Export pentru verificare rapidă
export const testMealEndpoint = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/meals/report', {
      params: { period: 'daily' },
      timeout: 5000
    });
    return true;
  } catch (error) {
    console.error('❌ Meal endpoint test failed:', error);
    return false;
  }
};