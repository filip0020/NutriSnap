import { Router, Request, Response } from 'express';
import User, { IUserDocument } from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
} from '../utils/tokenUtils';
import protect from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email și parola sunt obligatorii.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Parola trebuie să aibă minim 6 caractere.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Un utilizator cu acest email există deja.' });
    }

    const user = new User({ email, password });
    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await generateRefreshToken(user._id.toString());

    res.status(201).json({
      user: {
        _id: user._id,
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Eroare register:', err);
    res.status(500).json({ message: 'Eroare de server.' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email și parola sunt obligatorii.' });
    }

    const user: IUserDocument | null = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email sau parolă incorectă.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email sau parolă incorectă.' });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await generateRefreshToken(user._id.toString());

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Eroare login:', err);
    res.status(500).json({ message: 'Eroare de server.' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token lipsește.' });
    }

    const userId = await verifyRefreshToken(refreshToken);

    if (!userId) {
      return res.status(401).json({ message: 'Refresh token invalid sau expirat.' });
    }

    const newAccessToken = generateAccessToken(userId);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('Eroare refresh:', err);
    res.status(500).json({ message: 'Eroare la reîmprospătare.' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.json({ message: 'Logout realizat cu succes.' });
  } catch (err) {
    res.status(500).json({ message: 'Eroare la logout.' });
  }
});

router.get('/verify', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Utilizatorul nu există.' });
    }

    res.json({
      valid: true,
      user: {
        _id: user._id,
        email: user.email,
        caloriesTarget: user.caloriesTarget,
        activityLevel: user.activityLevel
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Eroare la verificare.' });
  }
});

export default router;