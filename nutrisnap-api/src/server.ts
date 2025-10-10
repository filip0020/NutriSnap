import dotenv from "dotenv";
import express, { Application, Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/authRoutes";
import mealRoutes from "./routes/mealRoutes";
import aiRoutes from "./routes/aiRoutes";
import userRoutes from "./routes/userRoutes";

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 5000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads folder");
}

// -----------------------------
// 🔒 CORS CONFIGURATION - FIXED
// -----------------------------
const allowedOrigins: string[] = [
  process.env.FRONTEND_URL || "",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://nutri-snap-two.vercel.app", // ✅ FIXED - removed /login
].filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log("✅ Allowing request with no origin");
      return callback(null, true);
    }

    // Check if origin is in allowed list or is a Vercel deployment
    if (allowedOrigins.includes(origin) || origin.includes(".vercel.app")) {
      console.log("✅ CORS allowed for:", origin);
      return callback(null, true);
    }

    console.warn("⚠️ CORS blocked origin:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ✅ Apply CORS before other middleware
app.use(cors(corsOptions));

// ✅ Explicitly handle OPTIONS requests
app.options("*", cors(corsOptions));

// -----------------------------
// 🧰 MIDDLEWARE
// -----------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin || "no origin");
  next();
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/users", userRoutes);
app.use("/ai", aiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  console.warn("❌ 404 Not Found:", req.method, req.path);
  res.status(404).json({
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use(
  (
    err: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("❌ Server Error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
);

const connectDB = async (retries = 5): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) throw new Error("Missing MONGODB_URI in environment");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ MongoDB connected successfully");
      console.log("📊 Database:", mongoose.connection.db?.databaseName);
      return;
    } catch (err: any) {
      console.error(`❌ Connection attempt ${attempt} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise((r) =>
        setTimeout(r, Math.min(1000 * 2 ** attempt, 10000))
      );
    }
  }
};

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log("🚀 Server started on port:", PORT);
      console.log("🌍 Environment:", process.env.NODE_ENV || "development");
      console.log("🔑 JWT Secret:", !!process.env.JWT_SECRET);
      console.log("🤖 Hugging Face API:", !!process.env.HUGGINGFACE_API_KEY);
      console.log("📡 CORS origins:", allowedOrigins);
      console.log("---");
    });

    server.timeout = 120_000;
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  console.log("⚠️ SIGTERM received, shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("⚠️ SIGINT received, shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

if (process.env.NODE_ENV === "production") {
  setInterval(() => console.log("🏓 Keep-alive ping"), 14 * 60 * 1000);
}

startServer();

export default app;