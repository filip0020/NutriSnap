"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const mealRoutes_1 = __importDefault(require("./routes/mealRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
// Ensure uploads folder exists
const uploadsDir = path_1.default.join(__dirname, "../uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    console.log("📁 Created uploads folder");
}
const allowedOrigins = [
    process.env.FRONTEND_URL || "",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://nutri-snap-two.vercel.app",
    "https://nutri-snap-two.vercel.app/",
].filter(Boolean);
const corsOptions = {
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
        // TEMPORARILY allow all for debugging - REMOVE IN PRODUCTION
        callback(null, true);
        // In production, use: callback(new Error("Not allowed by CORS"));
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
app.use((0, cors_1.default)(corsOptions));
// ✅ Explicitly handle OPTIONS requests
app.options("*", (0, cors_1.default)(corsOptions));
// -----------------------------
// 🧰 MIDDLEWARE
// -----------------------------
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log("Origin:", req.headers.origin || "no origin");
    next();
});
app.get("/", (_req, res) => {
    res.json({
        status: "online",
        message: "NutriSnap API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongodb: mongoose_1.default.connection.readyState === 1 ? "connected" : "disconnected",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ai: {
            provider: "Google Gemini 1.5 Flash",
            configured: !!process.env.GEMINI_API_KEY,
        },
    });
});
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/meals", mealRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/ai", aiRoutes_1.default);
// 404 handler
app.use((req, res) => {
    console.warn("❌ 404 Not Found:", req.method, req.path);
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.path,
        method: req.method,
        availableRoutes: [
            "/api/auth",
            "/api/meals",
            "/api/users",
            "/ai",
            "/health",
        ],
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error("❌ Server Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});
const connectDB = async (retries = 5) => {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI)
        throw new Error("Missing MONGODB_URI in environment");
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose_1.default.connect(mongoURI, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
            console.log("✅ MongoDB connected successfully");
            console.log("📊 Database:", mongoose_1.default.connection.db?.databaseName);
            return;
        }
        catch (err) {
            console.error(`❌ Connection attempt ${attempt} failed:`, err.message);
            if (attempt === retries)
                throw err;
            await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 10000)));
        }
    }
};
const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () => {
            console.log("\n🚀 ========================================");
            console.log("🚀 Server started on port:", PORT);
            console.log("🌍 Environment:", process.env.NODE_ENV || "development");
            console.log("🔑 JWT Secret:", !!process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET");
            console.log("🤖 Gemini API:", !!process.env.GEMINI_API_KEY ? "✅ SET" : "❌ NOT SET");
            console.log("📡 CORS origins:", allowedOrigins);
            console.log("🔗 Frontend URL:", process.env.FRONTEND_URL || "Not configured");
            console.log("========================================\n");
        });
        server.timeout = 120000;
    }
    catch (err) {
        console.error("❌ Failed to start server:", err);
        process.exit(1);
    }
};
process.on("SIGTERM", async () => {
    console.log("⚠️ SIGTERM received, shutting down gracefully...");
    await mongoose_1.default.connection.close();
    process.exit(0);
});
process.on("SIGINT", async () => {
    console.log("⚠️ SIGINT received, shutting down gracefully...");
    await mongoose_1.default.connection.close();
    process.exit(0);
});
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason);
});
if (process.env.NODE_ENV === "production") {
    setInterval(() => console.log("🏓 Keep-alive ping"), 14 * 60 * 1000);
}
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map