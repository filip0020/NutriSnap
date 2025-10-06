import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  caloriesTarget: number;
  activityLevel: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}


export interface IUserDocument extends Document {
  _id: Types.ObjectId; // 👈 adăugat explicit
  email: string;
  password: string;
  caloriesTarget: number;
  activityLevel: number;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const UserSchema: Schema<IUserDocument> = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  caloriesTarget: {
    type: Number,
    default: 2000
  },
  activityLevel: {
    type: Number,
    default: 0
  }
});

UserSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUserDocument>('User', UserSchema);
