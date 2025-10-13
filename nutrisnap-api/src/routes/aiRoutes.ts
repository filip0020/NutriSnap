import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import protect from '../middleware/auth';
import { AuthRequest } from '../models/User';

const router = express.Router();

// 🔑 Gemini API Key - citește din ENV
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
console.log('🔑 Gemini API Key:', GEMINI_API_KEY ? `SET ✅ (${GEMINI_API_KEY.substring(0, 10)}...)` : 'NOT SET ❌');

// Inițializează Gemini
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini:', error);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not found in environment variables!');
}

// 📁 Temp directory
const tmpDir = path.join(os.tmpdir(), 'nutrisnap_uploads');
try {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log('📁 Temp directory:', tmpDir);
} catch { /* exists */ }

// 📤 Multer setup
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`));
    }
  }
});

// 🍔 Interfața pentru răspunsul AI
interface FoodAnalysis {
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    weight_grams: number;
    ingredients: string[];
    description: string;
  }>;
  total_nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

// 🤖 Analizează imaginea cu Gemini
async function analyzeWithGemini(buffer: Buffer, mimeType: string): Promise<FoodAnalysis> {
  if (!genAI) {
    throw new Error('Gemini AI not initialized. Check GEMINI_API_KEY in environment.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    }
  });

  // Prompt EXTREM de detaliat pentru analiză nutrițională
  const prompt = `You are an expert nutritionist and food analyst. Analyze this food image in EXTREME detail.

CRITICAL INSTRUCTIONS:
1. Count EXACTLY how many items/portions are visible (e.g., "2 kebabs" not "1 kebab")
2. Identify ALL visible ingredients
3. Estimate the weight/portion size accurately based on visual cues
4. Distinguish between types (e.g., "pepperoni pizza" vs "margherita pizza")
5. Calculate nutritional values based on what you ACTUALLY SEE in the image
6. If you see multiple items, multiply nutrition accordingly

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{
  "items": [
    {
      "name": "Specific food name (e.g., 'Chicken Kebab with Vegetables')",
      "quantity": 2,
      "unit": "pieces",
      "weight_grams": 300,
      "ingredients": ["chicken", "pita bread", "lettuce", "tomato", "white sauce"],
      "description": "Two grilled chicken kebabs wrapped in pita bread with fresh vegetables and sauce"
    }
  ],
  "total_nutrition": {
    "calories": 650,
    "protein": 45,
    "carbs": 58,
    "fats": 24,
    "fiber": 6
  },
  "confidence": "high",
  "notes": "Clear view of 2 kebabs, each approximately 150g. Visible grilled chicken, fresh vegetables, white sauce."
}

IMPORTANT RULES:
- If image shows 2 items, multiply all nutrition by 2
- Be specific about ingredients you can actually see
- Use realistic nutritional data for similar foods
- confidence: "high" = clear image, "medium" = partially visible, "low" = unclear
- Always return valid JSON only`;

  try {
    console.log('🔄 Sending image to Gemini API...');

    // Convertește buffer-ul în format compatibil Gemini
    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('📥 Gemini raw response length:', text.length);
    console.log('📄 First 300 chars:', text.substring(0, 300));

    // Curăță răspunsul (elimină markdown dacă există)
    let jsonText = text.trim();

    // Elimină code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Elimină text înainte/după JSON
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    console.log('🧹 Cleaned JSON:', jsonText.substring(0, 200));

    const analysis: FoodAnalysis = JSON.parse(jsonText);

    // Validare strict
    if (!analysis.items || !Array.isArray(analysis.items) || analysis.items.length === 0) {
      throw new Error('Invalid response: missing items array');
    }
    if (!analysis.total_nutrition || typeof analysis.total_nutrition.calories !== 'number') {
      throw new Error('Invalid response: missing or invalid total_nutrition');
    }

    console.log('✅ Parsed successfully:', analysis.items.length, 'items detected');
    return analysis;

  } catch (error: any) {
    console.error('❌ Gemini API error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

// 🎯 Fallback basic (dacă AI nu merge)
function basicFallback(filename: string): FoodAnalysis {
  const lower = filename.toLowerCase();

  let mealName = 'Unknown Food';
  let calories = 250;
  let protein = 12;
  let carbs = 30;
  let fats = 10;
  let weight = 200;

  // Detecție simplă din nume fișier
  if (lower.includes('pizza')) {
    mealName = 'Pizza'; calories = 266; protein = 11; carbs = 33; fats = 10; weight = 100;
  } else if (lower.includes('burger') || lower.includes('hamburger')) {
    mealName = 'Burger'; calories = 295; protein = 17; carbs = 24; fats = 14; weight = 150;
  } else if (lower.includes('kebab') || lower.includes('shawarma')) {
    mealName = 'Kebab'; calories = 350; protein = 25; carbs = 35; fats = 12; weight = 200;
  } else if (lower.includes('salad')) {
    mealName = 'Salad'; calories = 150; protein = 8; carbs = 15; fats = 6; weight = 200;
  } else if (lower.includes('pasta') || lower.includes('spaghetti')) {
    mealName = 'Pasta'; calories = 158; protein = 6; carbs = 31; fats = 1; weight = 150;
  } else if (lower.includes('chicken')) {
    mealName = 'Chicken'; calories = 239; protein = 27; carbs = 0; fats = 14; weight = 150;
  } else if (lower.includes('rice')) {
    mealName = 'Rice'; calories = 130; protein = 2.7; carbs = 28; fats = 0.3; weight = 150;
  }

  return {
    items: [{
      name: mealName,
      quantity: 1,
      unit: 'portion',
      weight_grams: weight,
      ingredients: ['Detected from filename'],
      description: `${mealName} - analyzed from filename (AI unavailable)`
    }],
    total_nutrition: {
      calories,
      protein,
      carbs,
      fats
    },
    confidence: 'low',
    notes: 'Fallback analysis used - AI not available or failed'
  };
}

const skipAuth = process.env.SKIP_AUTH === 'true';

// 📸 Main endpoint - ANALYZE IMAGE
router.post(
  '/analyze-image',
  ...(skipAuth ? [] : [protect]),
  upload.single('foodImage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No image uploaded. Please upload a food image.'
      });
      return;
    }

    const filePath = file.path;
    console.log(`\n📸 ====== NEW REQUEST ======`);
    console.log(`File: ${file.originalname}`);
    console.log(`Size: ${(file.size / 1024).toFixed(1)}KB`);
    console.log(`Type: ${file.mimetype}`);

    try {
      const buffer = await fs.promises.readFile(filePath);
      let analysis: FoodAnalysis;
      let usedAI = false;
      let errorMessage = '';

      // Încearcă cu Gemini AI
      if (genAI) {
        try {
          console.log('🤖 Attempting AI analysis with Gemini...');
          analysis = await analyzeWithGemini(buffer, file.mimetype);
          usedAI = true;
          console.log(`✅ AI Success: ${analysis.items.length} item(s) detected`);
          console.log(`Total calories: ${analysis.total_nutrition.calories}`);
        } catch (aiError: any) {
          console.warn(`⚠️ AI analysis failed: ${aiError.message}`);
          errorMessage = aiError.message;
          analysis = basicFallback(file.originalname);
          console.log('📝 Using fallback detection from filename');
        }
      } else {
        console.warn('⚠️ Gemini AI not initialized, using fallback');
        errorMessage = 'Gemini API not configured';
        analysis = basicFallback(file.originalname);
      }

      // Răspuns structurat pentru frontend
      const response = {
        success: true,
        analysis: {
          items: analysis.items,
          totalNutrition: analysis.total_nutrition,
          confidence: analysis.confidence,
          notes: analysis.notes
        },
        metadata: {
          usedAI,
          aiProvider: usedAI ? 'Google Gemini 1.5 Flash' : 'Fallback Detection',
          timestamp: new Date().toISOString(),
          ...(errorMessage && !usedAI ? { warning: errorMessage } : {})
        }
      };

      res.json(response);
      console.log(`✅ Response sent successfully`);
      console.log(`====== END REQUEST ======\n`);

    } catch (error: any) {
      console.error('❌ FATAL ERROR:', error.message);
      console.error(error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze image',
        error: error.message
      });

    } finally {
      // Curăță fișierul temporar
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log('🗑️ Temp file deleted');
        }
      } catch (cleanupError) {
        console.error('⚠️ Failed to delete temp file:', cleanupError);
      }
    }
  }
);

// 🏥 Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'NutriSnap AI Food Analyzer',
    aiProvider: 'Google Gemini 1.5 Flash',
    apiConfigured: !!GEMINI_API_KEY,
    aiInitialized: !!genAI,
    features: [
      'Multi-item detection (counts 2 kebabs, not just 1)',
      'Ingredient identification',
      'Accurate portion size estimation',
      'Detailed nutritional analysis',
      'High accuracy with clear images',
      'Automatic fallback if AI fails'
    ],
    limits: {
      freeRequests: '1500 requests/day',
      maxFileSize: '10MB',
      supportedFormats: ['JPEG', 'PNG', 'WebP']
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: os.platform(),
      tempDir: tmpDir
    },
    timestamp: new Date().toISOString()
  });
});

// 🧪 Test endpoint (pentru debugging)
router.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'AI Routes are working!',
    geminiConfigured: !!GEMINI_API_KEY,
    geminiInitialized: !!genAI,
    keyPreview: GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET'
  });
});

export default router;