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
// Register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email și parola sunt obligatorii' });
        return;
    }
    if (password.length < 6) {
        res.status(400).json({ message: 'Parola trebuie să aibă minim 6 caractere' });
        return;
    }
    try {
        // Verificăm dacă utilizatorul există deja
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'Email-ul este deja înregistrat' });
            return;
        }
        // Creăm utilizatorul nou
        const user = new User_1.default({
            email,
            password,
            caloriesTarget: 2000,
            activityLevel: 0
        });
        await user.save();
        // Generăm tokene
        const accessToken = (0, tokenUtils_1.generateAccessToken)(user._id.toString());
        const refreshToken = await (0, tokenUtils_1.generateRefreshToken)(user._id.toString());
        console.log('✅ Utilizator înregistrat:', email);
        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            }
        });
    }
    catch (error) {
        console.error('❌ Eroare înregistrare:', error);
        res.status(500).json({ message: 'Eroare la înregistrare' });
    }
});
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email și parola sunt obligatorii' });
        return;
    }
    try {
        // Găsim utilizatorul
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Email sau parolă incorectă' });
            return;
        }
        // Verificăm parola
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Email sau parolă incorectă' });
            return;
        }
        // Generăm tokene
        const accessToken = (0, tokenUtils_1.generateAccessToken)(user._id.toString());
        const refreshToken = await (0, tokenUtils_1.generateRefreshToken)(user._id.toString());
        console.log('✅ Login reușit:', email);
        res.status(200).json({
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            }
        });
    }
    catch (error) {
        console.error('❌ Eroare login:', error);
        res.status(500).json({ message: 'Eroare la autentificare' });
    }
});
// Verify Token - endpoint nou pentru verificarea token-ului
router.get('/verify', auth_1.default, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User_1.default.findById(userId).select('-password');
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
            return;
        }
        console.log('✅ Token verificat pentru:', user.email);
        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            }
        });
    }
    catch (error) {
        console.error('❌ Eroare verificare token:', error);
        res.status(401).json({ message: 'Token invalid' });
    }
});
// Refresh Token
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token lipsește' });
        return;
    }
    try {
        // Verificăm refresh token-ul
        const userId = await (0, tokenUtils_1.verifyRefreshToken)(refreshToken);
        if (!userId) {
            res.status(401).json({ message: 'Refresh token invalid sau expirat' });
            return;
        }
        // Verificăm că utilizatorul există încă
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
            return;
        }
        // Generăm un nou access token
        const newAccessToken = (0, tokenUtils_1.generateAccessToken)(userId);
        console.log('✅ Token refreshed pentru:', user.email);
        res.status(200).json({
            accessToken: newAccessToken
        });
    }
    catch (error) {
        console.error('❌ Eroare refresh token:', error);
        res.status(500).json({ message: 'Eroare la refresh token' });
    }
});
// Logout
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token lipsește' });
        return;
    }
    try {
        // Revocăm refresh token-ul
        const revoked = await (0, tokenUtils_1.revokeRefreshToken)(refreshToken);
        if (revoked) {
            console.log('✅ Logout reușit');
            res.status(200).json({ message: 'Logout reușit' });
        }
        else {
            res.status(404).json({ message: 'Refresh token nu a fost găsit' });
        }
    }
    catch (error) {
        console.error('❌ Eroare logout:', error);
        res.status(500).json({ message: 'Eroare la logout' });
    }
});
// Logout All Devices - revocă toate token-urile utilizatorului
router.post('/logout-all', auth_1.default, async (req, res) => {
    try {
        const userId = req.user.id;
        await (0, tokenUtils_1.revokeAllUserTokens)(userId);
        console.log('✅ Logout all devices pentru user:', userId);
        res.status(200).json({ message: 'Logout de pe toate dispozitivele reușit' });
    }
    catch (error) {
        console.error('❌ Eroare logout all:', error);
        res.status(500).json({ message: 'Eroare la logout' });
    }
});
router.put('/profile', auth_1.default, async (req, res) => {
    try {
        const userId = req.user.id;
        const { caloriesTarget, activityLevel } = req.body;
        const updateData = {};
        if (caloriesTarget !== undefined) {
            if (caloriesTarget < 1000 || caloriesTarget > 5000) {
                res.status(400).json({ message: 'Ținta de calorii trebuie să fie între 1000 și 5000' });
                return;
            }
            updateData.caloriesTarget = caloriesTarget;
        }
        if (activityLevel !== undefined) {
            if (activityLevel < 0 || activityLevel > 1000) {
                res.status(400).json({ message: 'Nivelul de activitate invalid' });
                return;
            }
            updateData.activityLevel = activityLevel;
        }
        const user = await User_1.default.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
            return;
        }
        console.log('✅ Profil actualizat pentru:', user.email);
        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            }
        });
    }
    catch (error) {
        console.error('❌ Eroare actualizare profil:', error);
        res.status(500).json({ message: 'Eroare la actualizarea profilului' });
    }
});
// Get Profile
router.get('/profile', auth_1.default, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User_1.default.findById(userId).select('-password');
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
            return;
        }
        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                caloriesTarget: user.caloriesTarget,
                activityLevel: user.activityLevel
            }
        });
    }
    catch (error) {
        console.error('❌ Eroare get profile:', error);
        res.status(500).json({ message: 'Eroare la obținerea profilului' });
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map