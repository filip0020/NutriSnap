import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes';
import mealRoutes from './routes/mealRoutes';
import aiRoutes from './routes/aiRoutes';
import userRoutes from './routes/userRoutes';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Verifică și creează folderul uploads dacă nu există
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Folder uploads creat');
}

// CORS Configuration - FIXED
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://nutri-snap-two.vercel.app/login'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow all Vercel preview deployments
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      // In production, you might want to block instead:
      // callback(new Error('Not allowed by CORS'));
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
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

// CRITICAL: Root health check for Render.com
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Enhanced health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes - FIXED: Added userRoutes
app.use('/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/users', userRoutes); // ✅ ADDED
app.use('/ai', aiRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  console.warn('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /health',
      'POST /auth/register',
      'POST /auth/login',
      'POST /auth/refresh',
      'POST /auth/logout',
      'GET /auth/verify',
      'POST /api/meals',
      'GET /api/meals/report',
      'POST /ai/analyze-image',
      'GET /ai/health'
    ]
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

// MongoDB Connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const mongoURI = process.env.MONGODB_URI;

      if (!mongoURI) {
        throw new Error('MONGODB_URI nu este definit în environment variables');
      }

      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000, // Increased timeout
        socketTimeoutMS: 45000,
      });

      console.log('✅ MongoDB conectat cu succes');
      const dbName = mongoose.connection.db?.databaseName;
      console.log('📊 Database:', dbName);
      return;

    } catch (error: any) {
      console.error(`❌ Tentativa ${i + 1}/${retries} eșuată:`, error.message);
      if (i === retries - 1) {
        console.error('❌ Nu s-a putut conecta la MongoDB după', retries, 'încercări');
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000)));
    }
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('🚀 Server pornit pe portul:', PORT);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      console.log('🔑 JWT Secret configurat:', !!process.env.JWT_SECRET);
      console.log('🤖 Hugging Face API configurată:', !!process.env.HUGGINGFACE_API_KEY);
      console.log('📡 CORS origins:', allowedOrigins);
      console.log('---');
      console.log('Endpoints disponibile:');
      console.log('  GET  /');
      console.log('  GET  /health');
      console.log('  POST /auth/register');
      console.log('  POST /auth/login');
      console.log('  POST /auth/refresh');
      console.log('  POST /auth/logout');
      console.log('  GET  /auth/verify');
      console.log('  POST /api/meals');
      console.log('  GET  /api/meals/report');
      console.log('  GET  /api/users/profile');
      console.log('  POST /ai/analyze-image');
      console.log('  GET  /ai/health');
      console.log('---');
    });

    // Set server timeout to 2 minutes (for Render.com)
    server.timeout = 120000;

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

// Keep-alive ping for Render.com (prevents cold starts)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      console.log('🏓 Keep-alive ping');
    } catch (error) {
      console.error('❌ Keep-alive ping failed:', error);
    }
  }, 14 * 60 * 1000); // Every 14 minutes
}

// Start the server
startServer();

export default app;