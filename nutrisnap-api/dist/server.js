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
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectat cu succes la MongoDB.'))
    .catch((err) => console.error('Eroare de conectare la baza de date:', err.message));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/meals', mealRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.get('/', (req, res) => {
    res.send('NutriSnap API (TS) rulează!');
});
app.listen(PORT, () => {
    console.log(`Serverul rulează pe portul http://localhost:${PORT}`);
});
