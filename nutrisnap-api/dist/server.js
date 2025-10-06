"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const mealRoutes_1 = __importDefault(require("./routes/mealRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// ✅ CORS îmbunătățit - permite frontend-ul Vercel
const allowedOrigins = [
    'https://nutri-snap-two.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permite requests fără origin (Postman, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log('❌ Origin blocat:', origin);
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-JSON'],
    maxAge: 86400
}));
// Preflight pentru toate rutele
app.options('*', (0, cors_1.default)());
// Middleware pentru logging
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// MongoDB
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB conectat');
    }
    catch (err) {
        console.error('❌ Eroare MongoDB:', err);
        setTimeout(connectDB, 5000);
    }
};
connectDB();
// IMPORTANT: Rutele trebuie să aibă /api
app.use('/api/auth', authRoutes_1.default);
app.use('/api/meals', mealRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.get('/', (req, res) => {
    res.json({
        message: 'NutriSnap API 🚀',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        endpoints: {
            auth: '/api/auth',
            meals: '/api/meals',
            users: '/api/users',
            ai: '/api/ai'
        }
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// 404
app.use((req, res) => {
    res.status(404).json({
        message: 'Ruta nu există',
        path: req.path,
        method: req.method,
        hint: 'Verifică dacă URL-ul începe cu /api'
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Eroare:', err);
    res.status(500).json({
        message: 'Eroare server',
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});
const server = app.listen(PORT, () => {
    console.log(`🚀 Server pornit pe port: ${PORT}`);
    console.log(`📍 Frontend permis: ${allowedOrigins.join(', ')}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM - Închid serverul...');
    server.close(async () => {
        await mongoose_1.default.connection.close();
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map