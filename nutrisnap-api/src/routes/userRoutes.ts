import { Router, Response } from 'express';
import protect from '../middleware/auth';
import User from '../models/User';
import { AuthRequest } from '../types';

const router = Router();

router.get('/profile', protect, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    try {
        const user = await User.findById(userId).select('email caloriesTarget activityLevel');

        if (!user) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
        }
        
        res.status(200).json(user);

    } catch (error) {
        res.status(500).json({ message: 'Eroare la extragerea profilului.' });
    }
});

router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { caloriesTarget, activityLevel } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
        }

        if (caloriesTarget !== undefined && typeof caloriesTarget === 'number') {
            user.caloriesTarget = caloriesTarget;
        }
        if (activityLevel !== undefined && typeof activityLevel === 'number') {
            user.activityLevel = activityLevel;
        }

        await user.save();

        res.status(200).json({
            email: user.email,
            caloriesTarget: user.caloriesTarget,
            activityLevel: user.activityLevel
        });

    } catch (error) {
        res.status(500).json({ message: 'Eroare la actualizarea profilului.' });
    }
});

export default router;