"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
const foodDatabase = {
    pizza: { calories: 266, protein: 11, carbs: 33, fats: 10, avgWeight: 100 },
    burger: { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
    hamburger: { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
    cheeseburger: { calories: 303, protein: 15, carbs: 25, fats: 15, avgWeight: 150 },
    'hot dog': { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
    hotdog: { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
    fries: { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },
    'french fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },
    pasta: { calories: 131, protein: 5, carbs: 25, fats: 1, avgWeight: 150 },
    spaghetti: { calories: 158, protein: 6, carbs: 31, fats: 1, avgWeight: 150 },
    lasagna: { calories: 135, protein: 8, carbs: 11, fats: 6, avgWeight: 200 },
    ravioli: { calories: 175, protein: 7, carbs: 24, fats: 6, avgWeight: 150 },
    sandwich: { calories: 250, protein: 15, carbs: 30, fats: 8, avgWeight: 150 },
    wrap: { calories: 220, protein: 12, carbs: 28, fats: 7, avgWeight: 150 },
    burrito: { calories: 206, protein: 9, carbs: 26, fats: 7, avgWeight: 200 },
    taco: { calories: 226, protein: 9, carbs: 21, fats: 12, avgWeight: 100 },
    rice: { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, avgWeight: 150 },
    'fried rice': { calories: 163, protein: 3.5, carbs: 28, fats: 4, avgWeight: 150 },
    risotto: { calories: 143, protein: 3, carbs: 22, fats: 4, avgWeight: 150 },
    quinoa: { calories: 120, protein: 4.4, carbs: 21, fats: 1.9, avgWeight: 100 },
    chicken: { calories: 239, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
    'grilled chicken': { calories: 165, protein: 31, carbs: 0, fats: 3.6, avgWeight: 150 },
    'fried chicken': { calories: 246, protein: 19, carbs: 12, fats: 14, avgWeight: 150 },
    steak: { calories: 271, protein: 25, carbs: 0, fats: 19, avgWeight: 200 },
    beef: { calories: 250, protein: 26, carbs: 0, fats: 15, avgWeight: 150 },
    pork: { calories: 242, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
    lamb: { calories: 294, protein: 25, carbs: 0, fats: 21, avgWeight: 150 },
    bacon: { calories: 541, protein: 37, carbs: 1.4, fats: 42, avgWeight: 50 },
    sausage: { calories: 301, protein: 12, carbs: 3, fats: 27, avgWeight: 80 },
    fish: { calories: 206, protein: 22, carbs: 0, fats: 12, avgWeight: 150 },
    salmon: { calories: 208, protein: 20, carbs: 0, fats: 13, avgWeight: 150 },
    tuna: { calories: 144, protein: 23, carbs: 0, fats: 5, avgWeight: 150 },
    shrimp: { calories: 99, protein: 24, carbs: 0.2, fats: 0.3, avgWeight: 100 },
    sushi: { calories: 143, protein: 6, carbs: 21, fats: 3.5, avgWeight: 100 },
    egg: { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 50 },
    eggs: { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 100 },
    'scrambled eggs': { calories: 148, protein: 10, carbs: 1.3, fats: 11, avgWeight: 100 },
    omelette: { calories: 154, protein: 11, carbs: 1, fats: 12, avgWeight: 120 },
    cheese: { calories: 402, protein: 25, carbs: 1.3, fats: 33, avgWeight: 50 },
    yogurt: { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, avgWeight: 150 },
    milk: { calories: 42, protein: 3.4, carbs: 5, fats: 1, avgWeight: 200 },
    salad: { calories: 33, protein: 2.5, carbs: 6, fats: 0.3, avgWeight: 200 },
    vegetables: { calories: 65, protein: 3, carbs: 13, fats: 0.3, avgWeight: 150 },
    broccoli: { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, avgWeight: 100 },
    carrot: { calories: 41, protein: 0.9, carbs: 10, fats: 0.2, avgWeight: 100 },
    tomato: { calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, avgWeight: 100 },
    potato: { calories: 77, protein: 2, carbs: 17, fats: 0.1, avgWeight: 150 },
    'mashed potato': { calories: 105, protein: 2, carbs: 16, fats: 4, avgWeight: 150 },
    'baked potato': { calories: 93, protein: 2.5, carbs: 21, fats: 0.1, avgWeight: 150 },
    fruit: { calories: 50, protein: 0.5, carbs: 13, fats: 0.2, avgWeight: 100 },
    apple: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, avgWeight: 150 },
    banana: { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, avgWeight: 120 },
    orange: { calories: 47, protein: 0.9, carbs: 12, fats: 0.1, avgWeight: 130 },
    strawberry: { calories: 32, protein: 0.7, carbs: 8, fats: 0.3, avgWeight: 100 },
    watermelon: { calories: 30, protein: 0.6, carbs: 8, fats: 0.2, avgWeight: 150 },
    soup: { calories: 71, protein: 5.5, carbs: 9, fats: 2, avgWeight: 250 },
    'chicken soup': { calories: 62, protein: 7, carbs: 6, fats: 2, avgWeight: 250 },
    'vegetable soup': { calories: 67, protein: 3, carbs: 12, fats: 1.5, avgWeight: 250 },
    stew: { calories: 136, protein: 12, carbs: 10, fats: 5, avgWeight: 250 },
    bread: { calories: 265, protein: 9, carbs: 49, fats: 3.2, avgWeight: 50 },
    toast: { calories: 313, protein: 10, carbs: 59, fats: 4, avgWeight: 50 },
    bagel: { calories: 257, protein: 10, carbs: 50, fats: 1.5, avgWeight: 90 },
    croissant: { calories: 406, protein: 8, carbs: 46, fats: 21, avgWeight: 60 },
    muffin: { calories: 377, protein: 6, carbs: 51, fats: 17, avgWeight: 80 },
    cake: { calories: 257, protein: 2.6, carbs: 42, fats: 9, avgWeight: 100 },
    chocolate: { calories: 546, protein: 5, carbs: 61, fats: 31, avgWeight: 50 },
    cookie: { calories: 502, protein: 5.5, carbs: 64, fats: 25, avgWeight: 30 },
    'ice cream': { calories: 207, protein: 3.5, carbs: 24, fats: 11, avgWeight: 100 },
    donut: { calories: 452, protein: 5, carbs: 51, fats: 25, avgWeight: 60 },
    pancake: { calories: 227, protein: 6, carbs: 28, fats: 10, avgWeight: 80 },
    waffle: { calories: 291, protein: 7, carbs: 33, fats: 15, avgWeight: 80 },
    noodles: { calories: 138, protein: 4.5, carbs: 25, fats: 2, avgWeight: 150 },
    ramen: { calories: 188, protein: 7.5, carbs: 27, fats: 6, avgWeight: 200 },
    curry: { calories: 125, protein: 7, carbs: 12, fats: 6, avgWeight: 200 },
    dumplings: { calories: 210, protein: 8, carbs: 24, fats: 9, avgWeight: 100 },
    'spring roll': { calories: 140, protein: 4, carbs: 18, fats: 6, avgWeight: 80 },
    enchilada: { calories: 143, protein: 7, carbs: 14, fats: 7, avgWeight: 150 },
    quesadilla: { calories: 510, protein: 20, carbs: 39, fats: 30, avgWeight: 200 },
    nachos: { calories: 346, protein: 9, carbs: 36, fats: 19, avgWeight: 150 },
    kebab: { calories: 178, protein: 18, carbs: 5, fats: 10, avgWeight: 150 },
    falafel: { calories: 333, protein: 13, carbs: 32, fats: 18, avgWeight: 100 },
    hummus: { calories: 166, protein: 8, carbs: 14, fats: 10, avgWeight: 100 },
    shawarma: { calories: 260, protein: 25, carbs: 10, fats: 14, avgWeight: 150 },
    coffee: { calories: 2, protein: 0.3, carbs: 0, fats: 0, avgWeight: 200 },
    tea: { calories: 1, protein: 0, carbs: 0.3, fats: 0, avgWeight: 200 },
    juice: { calories: 45, protein: 0.5, carbs: 11, fats: 0.1, avgWeight: 200 },
    smoothie: { calories: 145, protein: 3, carbs: 30, fats: 2, avgWeight: 250 },
    chips: { calories: 536, protein: 6.6, carbs: 53, fats: 34, avgWeight: 50 },
    popcorn: { calories: 387, protein: 13, carbs: 78, fats: 4.5, avgWeight: 50 },
    nuts: { calories: 607, protein: 21, carbs: 21, fats: 54, avgWeight: 50 },
    crackers: { calories: 502, protein: 8, carbs: 61, fats: 25, avgWeight: 50 }
};
function estimateWeight(description, baseWeight) {
    const lower = description.toLowerCase();
    const sizeIndicators = {
        large: 1.5, big: 1.5, huge: 2.0, small: 0.7, tiny: 0.5, medium: 1.0,
        plate: 1.3, bowl: 1.2, cup: 0.8, slice: 0.4, piece: 0.6, serving: 1.0, portion: 1.0
    };
    for (const [k, v] of Object.entries(sizeIndicators)) {
        if (lower.includes(k))
            return Math.round(baseWeight * v);
    }
    const numberWords = {
        two: 2, three: 3, four: 4, five: 5, couple: 2, several: 3, few: 2
    };
    for (const [k, v] of Object.entries(numberWords)) {
        if (lower.includes(k))
            return Math.round(baseWeight * v);
    }
    return baseWeight;
}
function analyzeFoodFromDescription(description) {
    const lowerDesc = description.toLowerCase();
    const words = lowerDesc.split(/[\s,.-]+/);
    let bestMatch = null;
    let bestScore = 0;
    for (const [foodName, nutrition] of Object.entries(foodDatabase)) {
        let score = 0;
        if (lowerDesc.includes(foodName))
            score += 10;
        const foodWords = foodName.split(' ');
        for (const fw of foodWords) {
            if (words.includes(fw))
                score += 5;
        }
        for (const w of words) {
            if (!w)
                continue;
            if (foodName.includes(w) || w.includes(foodName))
                score += 3;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = { foodName, ...nutrition };
        }
    }
    if (bestMatch && bestScore >= 3) {
        const estimatedWeight = estimateWeight(description, bestMatch.avgWeight);
        const weightRatio = estimatedWeight / 100;
        return {
            mealName: bestMatch.foodName.charAt(0).toUpperCase() + bestMatch.foodName.slice(1),
            calories: Math.round(bestMatch.calories * weightRatio),
            protein: Math.round(bestMatch.protein * weightRatio * 10) / 10,
            carbs: Math.round(bestMatch.carbs * weightRatio * 10) / 10,
            fats: Math.round(bestMatch.fats * weightRatio * 10) / 10,
            weight: estimatedWeight,
            confidence: bestScore >= 8 ? 'high' : 'medium'
        };
    }
    return {
        mealName: 'Aliment necunoscut',
        calories: 250,
        protein: 12,
        carbs: 30,
        fats: 10,
        weight: 150,
        confidence: 'low'
    };
}
const tmpDir = path_1.default.join(os_1.default.tmpdir(), 'nutrisnap_uploads');
try {
    fs_1.default.mkdirSync(tmpDir, { recursive: true });
}
catch { /* ignore */ }
const upload = (0, multer_1.default)({
    dest: tmpDir,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Invalid file type. JPEG/PNG/WEBP allowed.'));
    }
});
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
console.log('🔑 Hugging Face API Key status:', HUGGINGFACE_API_KEY ? 'SET ✅' : 'NOT SET ❌');
async function analyzeWithHuggingFace(imageBuffer, retries = 3) {
    if (!HUGGINGFACE_API_KEY)
        throw new Error('HUGGINGFACE_API_KEY is not set');
    const API_URL = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large';
    for (let i = 0; i < retries; i++) {
        try {
            const resp = await axios_1.default.post(API_URL, imageBuffer, {
                headers: {
                    Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/octet-stream',
                    Accept: 'application/json'
                },
                timeout: 60000
            });
            const data = resp.data;
            let description = '';
            if (typeof data === 'string')
                description = data;
            else if (Array.isArray(data)) {
                if (data[0]?.generated_text)
                    description = data[0].generated_text;
                else if (data[0]?.caption)
                    description = data[0].caption;
                else
                    description = JSON.stringify(data);
            }
            else if (data?.generated_text)
                description = data.generated_text;
            else if (data?.caption)
                description = data.caption;
            else if (data?.error)
                throw new Error(String(data.error));
            if (!description)
                throw new Error('No caption returned from model');
            return description;
        }
        catch (err) {
            const status = err?.response?.status;
            const respData = err?.response?.data;
            console.error(`HuggingFace attempt ${i + 1} failed`, { message: err.message, status, respData });
            if (status === 503) {
                if (i < retries - 1) {
                    const wait = Math.min(20000 * (i + 1), 60000);
                    await new Promise((r) => setTimeout(r, wait));
                    continue;
                }
                throw new Error('Model is loading on Hugging Face. Try again in a minute.');
            }
            if (status === 404) {
                throw new Error(`Hugging Face model not found (404). Check model id: ${API_URL}`);
            }
            if (i === retries - 1) {
                const msg = respData?.error || respData || err.message;
                throw new Error(`Hugging Face request failed: ${String(msg)}`);
            }
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    throw new Error('Failed to get response from Hugging Face after retries');
}
const skipAuth = process.env.SKIP_AUTH === 'true';
router.post('/analyze-image', ...(skipAuth ? [] : [auth_1.default]), upload.single('foodImage'), async (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({ message: 'Niciun fișier primit.' });
        return;
    }
    const filePath = file.path;
    try {
        const imageBuffer = await fs_1.default.promises.readFile(filePath);
        const description = await analyzeWithHuggingFace(imageBuffer);
        const nutritionInfo = analyzeFoodFromDescription(description);
        const result = {
            mealName: nutritionInfo.mealName,
            calories: nutritionInfo.calories,
            nutrients: { protein: nutritionInfo.protein, carbs: nutritionInfo.carbs, fats: nutritionInfo.fats },
            weight: nutritionInfo.weight,
            confidence: nutritionInfo.confidence,
            aiDescription: description
        };
        res.json(result);
    }
    catch (error) {
        console.error('Route error:', error?.message || error);
        const devDetails = process.env.NODE_ENV === 'development' ? { stack: error?.stack, raw: error?.response?.data || null } : undefined;
        res.status(500).json({ message: error?.message || 'Eroare la analizarea imaginii', details: devDetails });
    }
    finally {
        try {
            if (fs_1.default.existsSync(filePath))
                await fs_1.default.promises.unlink(filePath);
        }
        catch (cleanupErr) {
            console.error('Failed to cleanup file:', cleanupErr);
        }
    }
});
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        aiProvider: 'Hugging Face',
        apiConfigured: !!HUGGINGFACE_API_KEY,
        model: 'Salesforce/blip-image-captioning-large',
        foodDatabaseSize: Object.keys(foodDatabase).length,
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=aiRoutes.js.map