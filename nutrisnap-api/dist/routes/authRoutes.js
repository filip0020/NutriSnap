"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
// Funcție utilitară pentru a genera token-ul
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, JWT_SECRET, {
        expiresIn: '7d', // Token-ul expiră după 7 zile
    });
};
// RUTA: /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password, caloriesTarget, activityLevel } = req.body;
    try {
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Un utilizator cu acest email există deja.' });
        }
        const user = new User_1.default({ email, password, caloriesTarget, activityLevel });
        await user.save(); // Parola este hash-uită prin middleware-ul din User.ts
        const token = generateToken(user._id.toString());
        // Trimiterea token-ului înapoi
        res.status(201).json({ token, userId: user._id, email: user.email });
    }
    catch (error) {
        res.status(500).json({ message: 'Eroare la înregistrare.', error });
    }
});
// RUTA: /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Email sau parolă incorectă.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email sau parolă incorectă.' });
        }
        const token = generateToken(user._id.toString());
        res.status(200).json({ token, userId: user._id, email: user.email, caloriesTarget: user.caloriesTarget });
    }
    catch (error) {
        res.status(500).json({ message: 'Eroare la logare.', error });
    }
});
exports.default = router;
