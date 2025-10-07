import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import mealRoutes from './routes/mealRoutes';
import userRoutes from './routes/userRoutes';
import aiRoutes from './routes/aiRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://nutri-snap-two.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Acceptă cereri fără origin (ex: Postman)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Dacă originul nu e permis, respinge fără eroare server 500
    console.log('❌ Origin blocat:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400
};

// Middleware CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'unknown'}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ MongoDB conectat');
  } catch (err) {
    console.error('❌ Eroare MongoDB:', err);
    console.log('🔁 Reîncercare în 5 secunde...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'NutriSnap API 🚀',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      meals: '/api/meals',
      users: '/api/users',
      ai: '/api/ai'
    }
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: 'Ruta nu există',
    path: req.path,
    method: req.method,
    hint: 'Verifică dacă URL-ul începe cu /api'
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Eroare server:', err);
  res.status(500).json({
    message: 'Eroare server',
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server pornit pe port: ${PORT}`);
  console.log(`📍 Frontend permis: ${allowedOrigins.join(', ')}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM - Închid serverul...');
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
});

export default app;
