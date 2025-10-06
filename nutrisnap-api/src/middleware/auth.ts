import { Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthRequest } from '../models/User';
import User, { IUserDocument } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

interface DecodedToken extends JwtPayload {
  id: string;
}

const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    res.status(401).json({ message: 'Nu ești autorizat, token-ul lipsește.' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (!decoded.id) {
      res.status(401).json({ message: 'Nu ești autorizat, token invalid.' });
      return;
    }

    const user: IUserDocument | null = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ message: 'Nu ești autorizat, utilizatorul nu există.' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      caloriesTarget: user.caloriesTarget,
      activityLevel: user.activityLevel,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Nu ești autorizat, token-ul a expirat.' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Nu ești autorizat, token invalid.' });
      return;
    }

    res.status(500).json({ message: 'Eroare la verificarea autentificării.' });
  }
};

export default protect;
