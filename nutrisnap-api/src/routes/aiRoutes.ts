import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import protect from '../middleware/auth';
import { AuthRequest } from '../models/User';

const router = express.Router();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

console.log('🔑 HF API Key:', HUGGINGFACE_API_KEY ? `SET ✅` : 'NOT SET ❌');

// 📁 Temp
const tmpDir = path.join(os.tmpdir(), 'nutrisnap_uploads');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }

// 📤 Multer
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file'));
  }
});

// 🍔 Food DB
interface Food {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  weight: number;
}

const FOODS: Record<string, Food> = {
  'pizza': { calories: 266, protein: 11, carbs: 33, fats: 10, weight: 100 },
  'burger': { calories: 295, protein: 17, carbs: 24, fats: 14, weight: 150 },
  'hamburger': { calories: 295, protein: 17, carbs: 24, fats: 14, weight: 150 },
  'pasta': { calories: 131, protein: 5, carbs: 25, fats: 1, weight: 150 },
  'spaghetti': { calories: 158, protein: 6, carbs: 31, fats: 1, weight: 150 },
  'chicken': { calories: 239, protein: 27, carbs: 0, fats: 14, weight: 150 },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, weight: 150 },
  'salad': { calories: 33, protein: 2.5, carbs: 6, fats: 0.3, weight: 200 },
  'steak': { calories: 271, protein: 25, carbs: 0, fats: 19, weight: 200 },
  'fish': { calories: 206, protein: 22, carbs: 0, fats: 12, weight: 150 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fats: 13, weight: 150 },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fats: 11, weight: 100 },
  'sandwich': { calories: 250, protein: 15, carbs: 30, fats: 8, weight: 150 },
  'fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, weight: 100 },
  'soup': { calories: 71, protein: 5.5, carbs: 9, fats: 2, weight: 250 },
  'bread': { calories: 265, protein: 9, carbs: 49, fats: 3.2, weight: 50 },
  'cake': { calories: 257, protein: 2.6, carbs: 42, fats: 9, weight: 100 }
};

// 🔍 Match food
function matchFood(desc: string) {
  const lower = desc.toLowerCase();
  let best: { name: string; food: Food } | null = null;
  let score = 0;

  for (const [name, food] of Object.entries(FOODS)) {
    const s = lower.includes(name) ? 15 : 0;
    if (s > score) {
      score = s;
      best = { name, food };
    }
  }

  if (best && score >= 15) {
    return {
      mealName: best.name.charAt(0).toUpperCase() + best.name.slice(1),
      ...best.food,
      confidence: 'high'
    };
  }

  return {
    mealName: 'Unknown Food',
    calories: 250,
    protein: 12,
    carbs: 30,
    fats: 10,
    weight: 150,
    confidence: 'low'
  };
}

// 🤖 HF API - CORRECT FORMAT for 2025
async function analyzeWithHF(buffer: Buffer): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY not set in environment variables');
  }

  const models = [
    'nlpconnect/vit-gpt2-image-captioning',
    'Salesforce/blip-image-captioning-base'
  ];

  let url = ''; // definim aici, vizibil pentru tot for-ul

  for (const model of models) {
    try {
      console.log(`🔄 Trying: ${model}`);

      // construim URL-ul în interiorul buclei
      url = `https://api-inference.huggingface.co/models/${model}`;

      const resp = await axios.post(url, buffer, {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/octet-stream'
        },
        timeout: 30000
      });

      let desc = '';
      if (Array.isArray(resp.data) && resp.data[0]) {
        desc = resp.data[0].generated_text || '';
      } else if (resp.data?.generated_text) {
        desc = resp.data.generated_text;
      }

      if (desc && desc.length > 3) {
        console.log(`✅ Success: "${desc}"`);
        return desc;
      }

    } catch (err: any) {
      console.error(`❌ ${model} failed:`, err.response?.status, err.response?.data || err.message);

      if (err.response?.status === 404) continue;

      if (err.response?.status === 503) {
        console.log('⏳ Model loading, waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));

        try {
          const retry = await axios.post(url, buffer, {
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/octet-stream'
            },
            timeout: 30000
          });

          let desc = '';
          if (Array.isArray(retry.data) && retry.data[0]) {
            desc = retry.data[0].generated_text || '';
          } else if (retry.data?.generated_text) {
            desc = retry.data.generated_text;
          }

          if (desc && desc.length > 3) {
            console.log(`✅ Success on retry: "${desc}"`);
            return desc;
          }
        } catch { /* continue to next model */ }
      }
    }
  }

  throw new Error('All AI models unavailable. Using fallback detection.');
}


const skipAuth = process.env.SKIP_AUTH === 'true';

// 📸 Main route
router.post(
  '/analyze-image',
  ...(skipAuth ? [] : [protect]),
  upload.single('foodImage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No image' });
      return;
    }

    const filePath = file.path;
    console.log(`📸 ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);

    try {
      const buffer = await fs.promises.readFile(filePath);

      let description = '';
      let usedAI = false;

      // Try AI first
      try {
        description = await analyzeWithHF(buffer);
        usedAI = true;
        console.log(`🤖 AI: "${description}"`);
      } catch (aiError: any) {
        console.warn(`⚠️ AI failed: ${aiError.message}`);
        // Fallback: use filename
        description = file.originalname.toLowerCase();
        console.log(`📝 Fallback: filename`);
      }

      const info = matchFood(description);

      res.json({
        success: true,
        mealName: info.mealName,
        calories: info.calories,
        nutrients: {
          protein: info.protein,
          carbs: info.carbs,
          fats: info.fats
        },
        weight: info.weight,
        confidence: usedAI ? info.confidence : 'medium',
        aiDescription: usedAI ? description : `Detected from filename: ${info.mealName}`
      });

      console.log(`✅ ${info.mealName} - ${info.calories} cal`);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });

    } finally {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch { /* ignore */ }
    }
  }
);

// 🏥 Health
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: 'Hugging Face (with fallback)',
    apiConfigured: !!HUGGINGFACE_API_KEY,
    models: [
      'nlpconnect/vit-gpt2-image-captioning',
      'Salesforce/blip-image-captioning-base'
    ],
    fallback: 'filename-based detection',
    foodItems: Object.keys(FOODS).length,
    timestamp: new Date().toISOString()
  });
});

export default router;