"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const protect = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        res.status(401).json({ message: 'Nu ești autorizat, token-ul lipsește.' });
        return;
    }
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            res.status(401).json({ message: 'Nu ești autorizat, token-ul lipsește.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded.id) {
            res.status(401).json({ message: 'Nu ești autorizat, token invalid.' });
            return;
        }
        const user = await User_1.default.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ message: 'Nu ești autorizat, utilizatorul nu există.' });
            return;
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            caloriesTarget: user.caloriesTarget,
            activityLevel: user.activityLevel,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ message: 'Nu ești autorizat, token invalid.' });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ message: 'Nu ești autorizat, token-ul a expirat.' });
            return;
        }
        res.status(500).json({ message: 'Eroare la verificarea autentificării.' });
    }
};
exports.default = protect;
