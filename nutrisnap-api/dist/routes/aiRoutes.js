"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
router.post('/analyze-image', upload.single('foodImage'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'Niciun fișier primit.' });
        return;
    }
    try {
        const imageBytes = fs_1.default.readFileSync(req.file.path);
        const base64Image = imageBytes.toString('base64');
        const prompt = `
      Analizează imaginea următoare. Identifică mâncarea și oferă:
      - Numele felului de mâncare
      - Estimarea caloriilor (kcal)
      - Proteine (g)
      - Carbohidrați (g)
      - Grăsimi (g)
      Returnează răspunsul strict în format JSON.
    `;
        const response = await axios_1.default.post('https://api.clarifai.com/v2/models/general-image-recognition/outputs', {
            inputs: [
                {
                    data: {
                        image: { base64: base64Image },
                        text: prompt
                    }
                }
            ]
        }, {
            headers: {
                Authorization: `Key ${CLARIFAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const text = response.data?.outputs?.[0]?.data?.text?.raw || '';
        let jsonData;
        try {
            jsonData = JSON.parse(text);
        }
        catch {
            jsonData = { mealName: 'Unknown', calories: 200, protein: 0, carbs: 0, fats: 0 };
        }
        fs_1.default.unlinkSync(req.file.path);
        res.json({
            mealName: jsonData.mealName || 'Unknown',
            calories: jsonData.calories || 200,
            nutrients: {
                protein: jsonData.protein || 0,
                carbs: jsonData.carbs || 0,
                fats: jsonData.fats || 0
            }
        });
    }
    catch (error) {
        console.error('Eroare AI:', error);
        res.status(500).json({ message: 'Eroare la procesare imagine.' });
    }
});
exports.default = router;
//# sourceMappingURL=aiRoutes.js.map