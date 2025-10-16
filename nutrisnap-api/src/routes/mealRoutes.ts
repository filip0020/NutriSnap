import { Router, Response } from 'express';
import protect from '../middleware/auth';
import Meal, { IMealDocument } from '../models/Meal';
import User from '../models/User';
import { AuthRequest } from '../models/User';

interface ReportQuery {
    period?: string;
    date?: string;
    [key: string]: any;
}

interface IMeal {
    name: string;
    calories: number;
    nutrients?: {
        protein: number;
        carbs: number;
        fats: number;
    };
    entryType: 'manual' | 'image_ai' | 'exercise';
    date?: string | Date;
}

const router = Router();

router.post('/', protect, async (req: AuthRequest<IMeal>, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { name, calories, nutrients, entryType, date } = req.body;

    if (!name || !calories || !entryType) {
        res.status(400).json({ message: 'Toate câmpurile necesare trebuie completate.' });
        return;
    }

    try {
        const newMeal: IMealDocument = new Meal({
            userId,
            name,
            calories,
            nutrients: entryType !== 'exercise' ? (nutrients || { protein: 0, carbs: 0, fats: 0 }) : { protein: 0, carbs: 0, fats: 0 },
            entryType,
            date: date ? new Date(date) : new Date()
        });

        await newMeal.save();
        res.status(201).json(newMeal);
    } catch (error) {
        res.status(500).json({ message: 'Eroare la salvarea intrării.' });
    }
});

router.get('/report', protect, async (req: AuthRequest<{}, ReportQuery>, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { period = 'daily', date: dateQuery } = req.query;

    let startDate: Date;
    let endDate: Date;
    const baseDate = dateQuery ? new Date(dateQuery as string) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    endDate = new Date(baseDate);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
        case 'weekly':
            startDate = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
            break;
        case 'daily':
        default:
            startDate = baseDate;
            break;
    }

    try {
        const user = await User.findById(userId).select('caloriesTarget activityLevel');
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
            return;
        }

        // ✅ FIX: Setează target implicit la 2000 dacă nu există
        const caloriesTarget = user.caloriesTarget || 2000;
        const activityLevel = user.activityLevel || 0;

        const meals = await Meal.find({ userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 });

        let totalConsumed = 0;
        let totalBurnedFromExercise = 0;
        const totalDays = period === 'daily' ? 1 : Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) || 1;

        meals.forEach(meal => {
            if (meal.entryType === 'exercise') {
                // ✅ Exercițiile ard calorii
                totalBurnedFromExercise += meal.calories;
            } else {
                // ✅ Mesele consumă calorii
                totalConsumed += meal.calories;
            }
        });

        const targetCaloriesTotal = caloriesTarget * totalDays;
        const balance = targetCaloriesTotal + totalBurnedFromExercise - totalConsumed;

        // ✅ Status bazat pe balanța ZILNICĂ medie
        const averageDailyBalance = balance / totalDays;
        let status: 'surplus' | 'deficit' | 'maintenance';

        if (averageDailyBalance < -100) {
            status = 'surplus'; // Ai mâncat prea mult (surplus caloric)
        } else if (averageDailyBalance > 100) {
            status = 'deficit'; // Mai ai de mâncat (deficit de consum)
        } else {
            status = 'maintenance'; // Perfect echilibrat
        }

        res.status(200).json({
            summary: {
                target: targetCaloriesTotal,
                totalConsumed,
                totalBurned: totalBurnedFromExercise,
                netCalories: totalConsumed - totalBurnedFromExercise, // Caloriile nete consumate
                balance, // Câte calorii mai poți consuma
                status
            },
            meals
        });
    } catch (error) {
        console.error('Eroare la generarea raportului:', error);
        res.status(500).json({ message: 'Eroare la generarea raportului caloric.' });
    }
});

export default router;