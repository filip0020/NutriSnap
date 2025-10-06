import apiClient from '../../utils/apiClient';

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
  const response = await apiClient.post<Meal>('/meals', meal);
  return response.data;
};

export const getMealReport = async (
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  date?: string
): Promise<MealReport> => {
  const params: any = { period };
  if (date) params.date = date;
  const response = await apiClient.get<MealReport>('/meals/report', { params });
  return response.data;
};