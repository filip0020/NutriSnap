import mongoose, { Document, Schema } from 'mongoose';
import { INutrients } from '../types'; 

export interface IMealDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  calories: number;
  nutrients: INutrients;
  date: Date;
  entryType: 'manual' | 'image_ai' | 'exercise'; 
}

const NutrientsSchema: Schema = new Schema<INutrients>({
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
}, { _id: false }); 

const MealSchema: Schema = new Schema<IMealDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  calories: {
    type: Number,
    required: true
  },
  nutrients: {
    type: NutrientsSchema,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  entryType: {
    type: String,
    enum: ['manual', 'image_ai', 'exercise'],
    required: true
  }
});

export default mongoose.model<IMealDocument>('Meal', MealSchema);