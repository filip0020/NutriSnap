import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import axios, { AxiosResponse } from 'axios';
import protect from '../middleware/auth';
import { AuthRequest } from '../models/User';

const router = express.Router();

// 🔑 Hugging Face Configuration
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

console.log('🔑 HF API Key:', HUGGINGFACE_API_KEY ? `SET ✅ (${HUGGINGFACE_API_KEY.substring(0, 10)}...)` : 'NOT SET ❌');

if (!HUGGINGFACE_API_KEY) {
  console.error('❌ CRITICAL: HUGGINGFACE_API_KEY not set!');
  console.log('📝 Get free key: https://huggingface.co/settings/tokens');
}

// 🎯 VERIFIED WORKING MODELS (October 2025)
const AI_MODELS = [
  'Salesforce/blip-image-captioning-base',
  'nlpconnect/vit-gpt2-image-captioning',
  'Salesforce/blip-image-captioning-large'
];

// 📁 Temp uploads
const tmpDir = path.join(os.tmpdir(), 'nutrisnap_uploads');
try {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log('✅ Temp dir:', tmpDir);
} catch { /* exists */ }

// 📤 Multer
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  }
});

// 🍔 Food Database
interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  avgWeight: number;
}

const FOOD_DATABASE: Record<string, Nutrition> = {
  'pizza': { calories: 266, protein: 11, carbs: 33, fats: 10, avgWeight: 100 },
  'burger': { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
  'hamburger': { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
  'cheeseburger': { calories: 303, protein: 15, carbs: 25, fats: 15, avgWeight: 150 },
  'hot dog': { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
  'fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },
  'french fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },
  'pasta': { calories: 131, protein: 5, carbs: 25, fats: 1, avgWeight: 150 },
  'spaghetti': { calories: 158, protein: 6, carbs: 31, fats: 1, avgWeight: 150 },
  'lasagna': { calories: 135, protein: 8, carbs: 11, fats: 6, avgWeight: 200 },
  'taco': { calories: 226, protein: 9, carbs: 21, fats: 12, avgWeight: 100 },
  'burrito': { calories: 206, protein: 9, carbs: 26, fats: 7, avgWeight: 200 },
  'nachos': { calories: 346, protein: 9, carbs: 36, fats: 19, avgWeight: 150 },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, avgWeight: 150 },
  'fried rice': { calories: 163, protein: 3.5, carbs: 28, fats: 4, avgWeight: 150 },
  'noodles': { calories: 138, protein: 4.5, carbs: 25, fats: 2, avgWeight: 150 },
  'ramen': { calories: 188, protein: 7.5, carbs: 27, fats: 6, avgWeight: 200 },
  'sushi': { calories: 143, protein: 6, carbs: 21, fats: 3.5, avgWeight: 100 },
  'chicken': { calories: 239, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
  'grilled chicken': { calories: 165, protein: 31, carbs: 0, fats: 3.6, avgWeight: 150 },
  'fried chicken': { calories: 246, protein: 19, carbs: 12, fats: 14, avgWeight: 150 },
  'steak': { calories: 271, protein: 25, carbs: 0, fats: 19, avgWeight: 200 },
  'beef': { calories: 250, protein: 26, carbs: 0, fats: 15, avgWeight: 150 },
  'fish': { calories: 206, protein: 22, carbs: 0, fats: 12, avgWeight: 150 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fats: 13, avgWeight: 150 },
  'tuna': { calories: 144, protein: 23, carbs: 0, fats: 5, avgWeight: 150 },
  'shrimp': { calories: 99, protein: 24, carbs: 0.2, fats: 0.3, avgWeight: 100 },
  'egg': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 50 },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 100 },
  'scrambled eggs': { calories: 148, protein: 10, carbs: 1.3, fats: 11, avgWeight: 100 },
  'sandwich': { calories: 250, protein: 15, carbs: 30, fats: 8, avgWeight: 150 },
  'wrap': { calories: 220, protein: 12, carbs: 28, fats: 7, avgWeight: 150 },
  'salad': { calories: 33, protein: 2.5, carbs: 6, fats: 0.3, avgWeight: 200 },
  'vegetables': { calories: 65, protein: 3, carbs: 13, fats: 0.3, avgWeight: 150 },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, avgWeight: 100 },
  'potato': { calories: 77, protein: 2, carbs: 17, fats: 0.1, avgWeight: 150 },
  'mashed potato': { calories: 105, protein: 2, carbs: 16, fats: 4, avgWeight: 150 },
  'soup': { calories: 71, protein: 5.5, carbs: 9, fats: 2, avgWeight: 250 },
  'bread': { calories: 265, protein: 9, carbs: 49, fats: 3.2, avgWeight: 50 },
  'cake': { calories: 257, protein: 2.6, carbs: 42, fats: 9, avgWeight: 100 },
  'chocolate': { calories: 546, protein: 5, carbs: 61, fats: 31, avgWeight: 50 },
  'cookie': { calories: 502, protein: 5.5, carbs: 64, fats: 25, avgWeight: 30 },
  'ice cream': { calories: 207, protein: 3.5, carbs: 24, fats: 11, avgWeight: 100 },
  'apple': { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, avgWeight: 150 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, avgWeight: 120 }
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'on', 'in', 'at', 'to', 'of', 'with', 'and', 'or',
  'is', 'are', 'plate', 'bowl', 'table', 'sitting', 'top', 'white'
]);

// 🔍 Food matching
function matchFood(desc: string) {
  console.log('🔍 Description:', desc);

  const lower = desc.toLowerCase();
  const words = lower.split(/[\s,.-]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  let best: { name: string; nutrition: Nutrition } | null = null;
  let score = 0;

  for (const [name, nutrition] of Object.entries(FOOD_DATABASE)) {
    let s = 0;
    if (lower.includes(name)) s += 15;

    name.split(' ').forEach(fw => {
      if (words.includes(fw)) s += 8;
    });

    if (s > score) {
      score = s;
      best = { name, nutrition };
    }
  }

  console.log('🎯 Match:', best?.name, 'Score:', score);

  if (best && score >= 4) {
    const conf = score >= 15 ? 'high' : (score >= 8 ? 'medium' : 'low');
    return {
      mealName: best.name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      calories: best.nutrition.calories,
      protein: best.nutrition.protein,
      carbs: best.nutrition.carbs,
      fats: best.nutrition.fats,
      weight: best.nutrition.avgWeight,
      confidence: conf
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

// 🤖 Call HF API
async function analyzeWithHF(buffer: Buffer): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error(
      '❌ HUGGINGFACE_API_KEY not set!\n\n' +
      '1. Go to: https://huggingface.co/settings/tokens\n' +
      '2. Create token (Read access)\n' +
      '3. Add to Render: Environment → HUGGINGFACE_API_KEY'
    );
  }

  console.log(`🚀 Trying ${AI_MODELS.length} models...`);

  for (const model of AI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🔄 [${attempt}/2] ${model}`);

        const url = `https://api-inference.huggingface.co/models/${model}`;
        const resp: AxiosResponse = await axios.post(url, buffer, {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          },
          timeout: 45000
        });

        console.log('📡 Status:', resp.status);

        let desc = '';
        const data = resp.data;

        if (Array.isArray(data) && data[0]) {
          desc = data[0].generated_text || '';
        } else if (data && typeof data === 'object') {
          desc = data.generated_text || '';
        }

        if (desc && desc.length > 3) {
          console.log(`✅ SUCCESS: "${desc}"`);
          return desc;
        }

        console.log('⚠️ Empty response');

        // Model loading?
        if (resp.status === 503 && attempt === 1) {
          console.log('⏳ Model loading, wait 5s...');
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error || err.message;

        console.error(`❌ Error:`, { status, msg });

        if (status === 503 && attempt === 1) {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        if (status === 401 || status === 403) {
          throw new Error(
            '❌ Invalid API key!\n\n' +
            'Check your HUGGINGFACE_API_KEY in Render environment variables.\n' +
            'Make sure it starts with "hf_"'
          );
        }

        if (status === 429) {
          throw new Error('⏱️ Rate limit! Wait a few minutes and try again.');
        }
      }
    }

    // Small delay between models
    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error(
    '❌ All models failed!\n\n' +
    'Solutions:\n' +
    '1. Wait 30 seconds (models might be loading)\n' +
    '2. Check API key is correct\n' +
    '3. Try again (free tier has rate limits)'
  );
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
    console.log('📸 Image:', file.originalname, `${(file.size / 1024).toFixed(1)}KB`);

    try {
      const buffer = await fs.promises.readFile(filePath);
      console.log('✅ Buffer ready');

      const desc = await analyzeWithHF(buffer);
      console.log('🔍 AI:', desc);

      const info = matchFood(desc);
      console.log('📊 Nutrition:', info);

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
        confidence: info.confidence,
        aiDescription: desc
      });

    } catch (error: any) {
      console.error('❌ Error:', error.message);

      res.status(500).json({
        success: false,
        message: error.message || 'Analysis failed'
      });

    } finally {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log('🗑️ Cleanup done');
        }
      } catch { /* ignore */ }
    }
  }
);

// 🏥 Health
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: 'Hugging Face',
    models: AI_MODELS,
    apiConfigured: !!HUGGINGFACE_API_KEY,
    apiKeyPreview: HUGGINGFACE_API_KEY ? `${HUGGINGFACE_API_KEY.substring(0, 10)}...` : 'NOT SET',
    foodDatabaseSize: Object.keys(FOOD_DATABASE).length,
    timestamp: new Date().toISOString()
  });
});

export default router;