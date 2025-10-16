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

/**
 * ✅ Adaugă o masă nouă
 */
export const addMeal = async (meal: Meal): Promise<Meal> => {
  try {
    console.log('📤 Sending meal:', meal);

    // ✅ FIX: Add /api prefix because baseURL doesn't include it
    const response = await apiClient.post<Meal>('/api/meals', meal);

    console.log('✅ Meal added successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding meal:', error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Serverul nu răspunde. Încearcă din nou în câteva secunde.');
    }
    if (error.response?.status === 404) {
      throw new Error('Ruta /api/meals nu a fost găsită. Verifică configurarea API_URL.');
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

    // ✅ FIX: Add /api prefix
    const response = await apiClient.get<MealReport>('/api/meals/report', { params });

    console.log('✅ Report received:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching report:', error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Serverul nu răspunde. Încearcă din nou în câteva secunde.');
    }
    if (error.response?.status === 404) {
      throw new Error('Ruta /api/meals/report nu a fost găsită.');
    }
    if (error.response?.status === 401) {
      throw new Error('Nu ești autentificat.');
    }

    throw error;
  }
};

export const testMealEndpoint = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/meals/report', {
      params: { period: 'daily' },
      timeout: 5000,
    });
    return true;
  } catch (error) {
    console.error('❌ Meal endpoint test failed:', error);
    return false;
  }
};