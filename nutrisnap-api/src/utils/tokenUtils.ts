import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await RefreshToken.create({
    userId: new Types.ObjectId(userId),
    token,
    expiresAt
  });

  return token;
};

export const verifyRefreshToken = async (token: string): Promise<string | null> => {
  const refreshToken = await RefreshToken.findOne({ token });
  if (!refreshToken || refreshToken.expiresAt < new Date()) {
    if (refreshToken) await RefreshToken.deleteOne({ token });
    return null;
  }
  return refreshToken.userId.toString();
};

export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  const result = await RefreshToken.deleteOne({ token });
  return result.deletedCount > 0;
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await RefreshToken.deleteMany({ userId: new Types.ObjectId(userId) });
};