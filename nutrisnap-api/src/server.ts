import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// Import routes
import authRoutes from './routes/authRoutes';
import mealRoutes from './routes/mealRoutes';
import aiRoutes from './routes/aiRoutes';
import userRoutes from './routes/userRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Verifică și creează folderul uploads dacă nu există
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Folder uploads creat');
}

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://your-app.vercel.app' // Înlocuiește cu URL-ul tău de pe Vercel
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(null, true); // În producție, schimbă cu: callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/ai', aiRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  console.warn('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error Handler
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('❌ Server Error:', error);
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI nu este definit în environment variables');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB conectat cu succes');

    // Log database name
    const dbName = mongoose.connection.db?.databaseName;
    console.log('📊 Database:', dbName);

  } catch (error: any) {
    console.error('❌ Eroare conectare MongoDB:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('🚀 Server pornit pe portul:', PORT);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      console.log('🔑 JWT Secret configurat:', !!process.env.JWT_SECRET);
      console.log('🤖 Clarifai API configurată:', !!(process.env.CLARIFAI_API_KEY || process.env.CLARIFAI_PAT));
      console.log('📡 CORS origins:', allowedOrigins);
      console.log('---');
      console.log('Endpoints disponibile:');
      console.log('  GET  /health');
      console.log('  POST /auth/register');
      console.log('  POST /auth/login');
      console.log('  POST /auth/refresh');
      console.log('  POST /auth/logout');
      console.log('  GET  /auth/verify');
      console.log('  POST /meals');
      console.log('  GET  /meals/report');
      console.log('  POST /ai/analyze-image');
      console.log('  GET  /ai/health');
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Eroare la pornirea serverului:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM primit, închidere graceful...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT primit, închidere graceful...');
  await mongoose.connection.close();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Start the server
startServer();

export default app;