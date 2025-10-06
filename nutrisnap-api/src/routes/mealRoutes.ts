import { Router, Response } from 'express';
import protect from '../middleware/auth';
import Meal, { IMealDocument } from '../models/Meal';
import User from '../models/User';
import { AuthRequest, IMeal } from '../types';

const router = Router();

router.post('/', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, calories, nutrients, entryType, date } = req.body as IMeal;

  if (!name || !calories || !entryType) {
    return res.status(400).json({ message: 'Toate câmpurile necesare trebuie completate.' });
  }

  try {
    const newMeal: IMealDocument = new Meal({
      userId,
      name,
      calories,
      nutrients: entryType !== 'exercise' ? (nutrients || { protein: 0, carbs: 0, fats: 0 }) : { protein: 0, carbs: 0, fats: 0 },
      entryType,
      date: date || new Date()
    });

    await newMeal.save();
    res.status(201).json(newMeal);
  } catch (error) {
    res.status(500).json({ message: 'Eroare la salvarea intrării.' });
  }
});

router.get('/report', protect, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { period = 'daily' } = req.query; 
    let { date: dateQuery } = req.query;

    let startDate: Date;
    let endDate: Date;

    const baseDate = dateQuery ? new Date(dateQuery as string) : new Date();
    baseDate.setHours(0, 0, 0, 0); 
    
    endDate = new Date(baseDate);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
        case 'weekly':
            startDate = new Date(baseDate.getTime() - (7 * 24 * 60 * 60 * 1000));
            break;
        case 'monthly':
            startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
            break;
        case 'daily':
        default:
            startDate = baseDate;
            endDate = new Date(baseDate);
            endDate.setHours(23, 59, 59, 999);
            break;
    }
    
    try {
        const user = await User.findById(userId).select('caloriesTarget activityLevel');
        if (!user) return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
        
        const { caloriesTarget, activityLevel } = user;
        
        const meals = await Meal.find({
            userId: userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        let totalConsumed = 0;
        let totalBurnedFromEntries = 0;
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        
        meals.forEach(meal => {
            if (meal.entryType === 'exercise') {
                totalBurnedFromEntries += meal.calories;
            } else {
                totalConsumed += meal.calories;
            }
        });
        
        const baseActivityBurned = activityLevel * totalDays;
        const totalBurned = totalBurnedFromEntries + baseActivityBurned;
        
        const netCalories = totalConsumed - totalBurned;
        const targetCaloriesTotal = caloriesTarget * totalDays;

        const deficitOrSurplus = netCalories - targetCaloriesTotal;
        
        const status = deficitOrSurplus > 100 ? 'surplus' : deficitOrSurplus < -100 ? 'deficit' : 'maintenance';

        res.status(200).json({
            summary: {
                target: targetCaloriesTotal,
                totalConsumed: totalConsumed,
                totalBurned: totalBurned,
                netCalories: netCalories,
                balance: deficitOrSurplus, 
                status: status,
            },
            meals: meals
        });

    } catch (error) {
        console.error("Eroare la generarea raportului:", error);
        res.status(500).json({ message: 'Eroare la generarea raportului caloric.' });
    }
});


export default router;