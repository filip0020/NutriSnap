import { Request } from 'express';

export interface INutrients {
  protein: number;
  carbs: number;
  fats: number;
}

export interface IAIResponse {
  mealName: string;
  calories: number;
  nutrients: INutrients;
}

export interface IMeal {
  userId: string;
  name: string;
  calories: number;
  nutrients: INutrients;
  date: Date;
  entryType: 'manual' | 'image_ai' | 'exercise';
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}