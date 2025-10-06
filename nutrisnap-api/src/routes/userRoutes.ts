import { Router, Response } from 'express';
import protect from '../middleware/auth';
import User from '../models/User';
import { AuthRequest } from '../models/User';

const router = Router();

router.get('/profile', protect, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    try {
        const user = await User.findById(userId).select('email caloriesTarget activityLevel');
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
            return;
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Eroare la extragerea profilului.' });
    }
});

router.put('/profile', protect, async (req: AuthRequest<{ caloriesTarget?: number; activityLevel?: number }>, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { caloriesTarget, activityLevel } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
            return;
        }

        if (caloriesTarget !== undefined) user.caloriesTarget = caloriesTarget;
        if (activityLevel !== undefined) user.activityLevel = activityLevel;

        await user.save();

        res.status(200).json({ email: user.email, caloriesTarget: user.caloriesTarget, activityLevel: user.activityLevel });
    } catch (error) {
        res.status(500).json({ message: 'Eroare la actualizarea profilului.' });
    }
});

export default router;
