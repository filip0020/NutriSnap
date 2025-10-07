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

// === Allowed frontend origins ===
const allowedOrigins = [
  'https://nutri-snap-two.vercel.app', // ✅ Vercel
  'http://localhost:5173',              // ✅ Dev
  'http://localhost:3000'               // ✅ Dev alt port
];

// === CORS configuration ===
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server / Postman
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log('❌ Origin blocat:', origin);
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions)); // ✅ aplicăm regula completă
app.options('*', cors(corsOptions)); // ✅ pentru preflight

// === Body parsers ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === Logging ===
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'unknown'}`);
  next();
});

// === MongoDB ===
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

// === Routes ===
app.use('/auth', authRoutes);
app.use('/meals', mealRoutes);
app.use('/users', userRoutes);
app.use('/ai', aiRoutes);

// === Health & root ===
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'NutriSnap API 🚀',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/auth',
      meals: '/meals',
      users: '/users',
      ai: '/ai'
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

// === 404 handler ===
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: 'Ruta nu există',
    path: req.path,
    method: req.method,
    hint: 'Verifică dacă URL-ul este corect'
  });
});

// === Error handler ===
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Eroare server:', err);
  res.status(500).json({
    message: 'Eroare server',
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// === Start server ===
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
