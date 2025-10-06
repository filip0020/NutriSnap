"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const tokenUtils_1 = require("../utils/tokenUtils");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email și parola sunt obligatorii.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Parola trebuie să aibă minim 6 caractere.' });
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Un utilizator cu acest email există deja.' });
        }
        const user = new User_1.default({ email, password });
        await user.save();
        const accessToken = (0, tokenUtils_1.generateAccessToken)(user._id.toString());
        const refreshToken = await (0, tokenUtils_1.generateRefreshToken)(user._id.toString());
        res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            },
            accessToken,
            refreshToken
        });
    }
    catch (err) {
        console.error('Eroare register:', err);
        res.status(500).json({ message: 'Eroare de server.' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email și parola sunt obligatorii.' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Email sau parolă incorectă.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email sau parolă incorectă.' });
        }
        const accessToken = (0, tokenUtils_1.generateAccessToken)(user._id.toString());
        const refreshToken = await (0, tokenUtils_1.generateRefreshToken)(user._id.toString());
        res.json({
            user: {
                _id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            },
            accessToken,
            refreshToken
        });
    }
    catch (err) {
        console.error('Eroare login:', err);
        res.status(500).json({ message: 'Eroare de server.' });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token lipsește.' });
        }
        const userId = await (0, tokenUtils_1.verifyRefreshToken)(refreshToken);
        if (!userId) {
            return res.status(401).json({ message: 'Refresh token invalid sau expirat.' });
        }
        const newAccessToken = (0, tokenUtils_1.generateAccessToken)(userId);
        res.json({ accessToken: newAccessToken });
    }
    catch (err) {
        console.error('Eroare refresh:', err);
        res.status(500).json({ message: 'Eroare la reîmprospătare.' });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await (0, tokenUtils_1.revokeRefreshToken)(refreshToken);
        }
        res.json({ message: 'Logout realizat cu succes.' });
    }
    catch (err) {
        res.status(500).json({ message: 'Eroare la logout.' });
    }
});
router.get('/verify', auth_1.default, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User_1.default.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Utilizatorul nu există.' });
        }
        res.json({
            valid: true,
            user: {
                _id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            }
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Eroare la verificare.' });
    }
});
exports.default = router;
