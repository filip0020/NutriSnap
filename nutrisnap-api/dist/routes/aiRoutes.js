"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/aiRoutes.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Configurarea stocării imaginilor temporare
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// RUTA CRITICĂ: Analiza imaginii
router.post('/analyze-image', upload.single('foodImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Niciun fișier imagine nu a fost furnizat.' });
    }
    // Simulăm răspunsul AI, tipizat ca IAIResponse
    const simulatedResponse = {
        mealName: 'Salată de ton cu ou',
        calories: Math.floor(Math.random() * (550 - 250 + 1)) + 250, // 250-550 Kcal
        nutrients: {
            protein: 40,
            carbs: 15,
            fats: 30
        }
    };
    try {
        // În mediul real, aici s-ar face apelul API extern.
        // De asemenea, se șterge fișierul de pe disc după procesare.
        return res.json(simulatedResponse);
    }
    catch (error) {
        console.error("Eroare la analiza AI:", error);
        return res.status(500).json({ message: 'Eroare la procesarea imaginii.' });
    }
});
exports.default = router;
