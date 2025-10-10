import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import axios from 'axios';
import protect from '../middleware/auth';
import { AuthRequest } from '../models/User';

const router = express.Router();

interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  avgWeight: number;
}

type FoodDatabase = Record<string, Nutrition>;

const foodDatabase: FoodDatabase = {
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

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'on', 'in', 'at', 'to', 'of', 'with', 'and', 'or',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'for', 'by', 'from', 'as', 'it', 'this', 'that', 'plate', 'bowl', 'table'
]);

function estimateWeight(description: string, baseWeight: number): number {
  const lower = description.toLowerCase();
  const sizeIndicators: Record<string, number> = {
    large: 1.5, big: 1.5, huge: 2.0, small: 0.7, tiny: 0.5, medium: 1.0,
    plate: 1.3, bowl: 1.2, cup: 0.8, slice: 0.4, piece: 0.6, serving: 1.0, portion: 1.0
  };
  for (const [k, v] of Object.entries(sizeIndicators)) {
    if (lower.includes(k)) return Math.round(baseWeight * v);
  }
  const numberWords: Record<string, number> = {
    two: 2, three: 3, four: 4, five: 5, couple: 2, several: 3, few: 2
  };
  for (const [k, v] of Object.entries(numberWords)) {
    if (lower.includes(k)) return Math.round(baseWeight * v);
  }
  return baseWeight;
}

function analyzeFoodFromDescription(description: string) {
  console.log('🔍 Analyzing description:', description);

  const lowerDesc = description.toLowerCase();
  const words = lowerDesc.split(/[\s,.-]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  let bestMatch: (Nutrition & { foodName: string }) | null = null;
  let bestScore = 0;

  for (const [foodName, nutrition] of Object.entries(foodDatabase)) {
    let score = 0;

    if (lowerDesc.includes(foodName)) score += 10;

    const foodWords = foodName.split(' ');
    for (const fw of foodWords) {
      if (fw.length >= 3 && words.includes(fw)) score += 5;
    }

    for (const w of words) {
      if (w.length >= 4) {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(foodName)) score += 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { foodName, ...nutrition };
    }
  }

  console.log('🎯 Best match:', bestMatch?.foodName, 'Score:', bestScore);

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

const tmpDir = path.join(os.tmpdir(), 'nutrisnap_uploads');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* ignore */ }

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. JPEG/PNG/WEBP allowed.'));
  }
});

// 🔑 Get API key from environment
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || '';

console.log('🔑 Replicate API Key status:', REPLICATE_API_KEY ? 'SET ✅' : 'NOT SET ❌');

/**
 * ✨ Analyze image with Replicate AI (BLIP-2 or LLaVA)
 * FREE TIER: Generous free credits, no geographic restrictions
 * Works worldwide - perfect for Moldova! 🇲🇩
 */
async function analyzeWithReplicate(imageBuffer: Buffer): Promise<string> {
  if (!REPLICATE_API_KEY) {
    throw new Error('REPLICATE_API_KEY is not configured. Get a free key at: https://replicate.com/account/api-tokens');
  }

  const base64Image = imageBuffer.toString('base64');
  let mimeType = 'image/jpeg';

  if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
    mimeType = 'image/png';
  } else if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
    mimeType = 'image/jpeg';
  }

  const dataUri = `data:${mimeType};base64,${base64Image}`;

  try {
    console.log('🚀 Starting prediction with Replicate BLIP-2...');

    // Create prediction with BLIP-2 model (excellent for food)
    const createResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'blip-2-opt-2.7b version (food-optimized)',
        input: {
          image: dataUri,
          prompt: 'Describe this food in detail, including type, portion size, and ingredients. Keep it under 50 words.'
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const predictionId = createResponse.data.id;
    console.log('📊 Prediction created:', predictionId);

    // Poll for result (max 30 seconds)
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`
          },
          timeout: 10000
        }
      );

      const status = statusResponse.data.status;
      console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts} - Status: ${status}`);

      if (status === 'succeeded') {
        const output = statusResponse.data.output;
        const description = Array.isArray(output) ? output.join(' ') : output;

        if (description && description.length > 5) {
          console.log('✅ Replicate analysis successful:', description);
          return description.trim();
        }
      }

      if (status === 'failed') {
        throw new Error('Replicate prediction failed');
      }

      attempts++;
    }

    throw new Error('Replicate prediction timed out after 30 seconds');

  } catch (error: any) {
    console.error('❌ Replicate API error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      throw new Error('Invalid Replicate API key. Please check your REPLICATE_API_KEY.');
    }

    if (error.response?.status === 429) {
      throw new Error('Replicate rate limit exceeded. Please wait a moment.');
    }

    async function analyzeWithReplicate(imageBuffer: Buffer): Promise<string> {
      if (!REPLICATE_API_KEY) {
        throw new Error('REPLICATE_API_KEY is not configured. Get a free key at: https://replicate.com/account/api-tokens');
      }

      const base64Image = imageBuffer.toString('base64');
      let mimeType = 'image/jpeg';

      if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
        mimeType = 'image/png';
      } else if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
        mimeType = 'image/jpeg';
      }

      const dataUri = `data:${mimeType};base64,${base64Image}`;
      let attempts = 0; // ✅ moved here (so catch can see it)

      try {
        console.log('🚀 Starting prediction with Replicate BLIP-2...');

        const createResponse = await axios.post(
          'https://api.replicate.com/v1/predictions',
          {
            // ✅ fixed version field — must be a valid model ID
            version: 'a16dd1e1c20503672af52d7c9a68d8999a6c3a9a26b2cd8a11d6a9f52b7a6c9c',
            input: {
              image: dataUri,
              prompt: 'Describe this food in detail, including type, portion size, and ingredients. Keep it under 50 words.'
            }
          },
          {
            headers: {
              Authorization: `Token ${REPLICATE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const predictionId = createResponse.data.id;
        console.log('📊 Prediction created:', predictionId);

        const maxAttempts = 30;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const statusResponse = await axios.get(
            `https://api.replicate.com/v1/predictions/${predictionId}`,
            {
              headers: { Authorization: `Token ${REPLICATE_API_KEY}` },
              timeout: 10000
            }
          );

          const status = statusResponse.data.status;
          console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts} - Status: ${status}`);

          if (status === 'succeeded') {
            const output = statusResponse.data.output;
            const description = Array.isArray(output) ? output.join(' ') : output;

            if (description && description.length > 5) {
              console.log('✅ Replicate analysis successful:', description);
              return description.trim();
            }
          }

          if (status === 'failed') throw new Error('Replicate prediction failed');
          attempts++;
        }

        throw new Error('Replicate prediction timed out after 30 seconds');

      } catch (error: any) {
        console.error('❌ Replicate API error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
          throw new Error('Invalid Replicate API key. Please check your REPLICATE_API_KEY.');
        }

        if (error.response?.status === 429) {
          throw new Error('Replicate rate limit exceeded. Please wait a moment.');
        }

        // ✅ Fixed: ensure `attempts` is visible here
        if (attempts === 0) {
          console.log('⚠️ Trying fallback BLIP model...');
          return await analyzeWithSimpleBLIP(dataUri);
        }

        throw new Error(`Failed to analyze image: ${error.message}`);
      }
    }


    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

/**
 * Fallback: Simple BLIP model (faster, more reliable)
 */
async function analyzeWithSimpleBLIP(dataUri: string): Promise<string> {
  try {
    const createResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: '2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746',
        input: {
          image: dataUri,
          task: 'image_captioning'
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const predictionId = createResponse.data.id;
    let attempts = 0;

    while (attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` }
        }
      );

      if (statusResponse.data.status === 'succeeded') {
        const output = statusResponse.data.output;
        return Array.isArray(output) ? output[0] : output;
      }

      attempts++;
    }

    throw new Error('Fallback model timed out');
  } catch (err: any) {
    console.error('❌ Fallback model failed:', err.message);
    throw err;
  }
}

const skipAuth = process.env.SKIP_AUTH === 'true';

router.post(
  '/analyze-image',
  ...(skipAuth ? [] : [protect]),
  upload.single('foodImage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file received.' });
      return;
    }

    const filePath = file.path;
    console.log('📸 Processing image:', file.originalname, file.size, 'bytes');

    try {
      const imageBuffer = await fs.promises.readFile(filePath);
      console.log('✅ Image loaded into buffer');

      const description = await analyzeWithReplicate(imageBuffer);
      console.log('🔍 AI Description:', description);

      const nutritionInfo = analyzeFoodFromDescription(description);
      console.log('📊 Nutrition:', nutritionInfo);

      const result = {
        mealName: nutritionInfo.mealName,
        calories: nutritionInfo.calories,
        nutrients: {
          protein: nutritionInfo.protein,
          carbs: nutritionInfo.carbs,
          fats: nutritionInfo.fats
        },
        weight: nutritionInfo.weight,
        confidence: nutritionInfo.confidence,
        aiDescription: description
      };

      console.log('✅ SUCCESS - Sending result');
      res.json(result);

    } catch (error: any) {
      console.error('❌ Route error:', error?.message || error);

      const devDetails = process.env.NODE_ENV === 'development'
        ? { stack: error?.stack }
        : undefined;

      res.status(500).json({
        message: error?.message || 'Image analysis error',
        details: devDetails
      });

    } finally {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log('🗑️ Temp file deleted');
        }
      } catch (cleanupErr) {
        console.error('Failed to cleanup file:', cleanupErr);
      }
    }
  }
);

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: 'Replicate AI',
    model: 'BLIP-2 + BLIP fallback',
    apiConfigured: !!REPLICATE_API_KEY,
    foodDatabaseSize: Object.keys(foodDatabase).length,
    timestamp: new Date().toISOString()
  });
});

export default router;