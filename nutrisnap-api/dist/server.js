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
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/meals', mealRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.get('/', (req, res) => {
    res.json({ message: 'NutriSnap API 🚀' });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
});
