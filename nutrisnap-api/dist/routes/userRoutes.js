"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../middleware/auth"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
router.get('/profile', auth_1.default, async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User_1.default.findById(userId).select('email caloriesTarget activityLevel');
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Eroare la extragerea profilului.' });
    }
});
router.put('/profile', auth_1.default, async (req, res) => {
    const userId = req.user.id;
    const { caloriesTarget, activityLevel } = req.body;
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
            return;
        }
        if (caloriesTarget !== undefined)
            user.caloriesTarget = caloriesTarget;
        if (activityLevel !== undefined)
            user.activityLevel = activityLevel;
        await user.save();
        res.status(200).json({ email: user.email, caloriesTarget: user.caloriesTarget, activityLevel: user.activityLevel });
    }
    catch (error) {
        res.status(500).json({ message: 'Eroare la actualizarea profilului.' });
    }
});
exports.default = router;
//# sourceMappingURL=userRoutes.js.map