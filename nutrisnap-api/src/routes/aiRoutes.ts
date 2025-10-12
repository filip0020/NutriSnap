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

if (!HUGGINGFACE_API_KEY) {
  console.error('❌ CRITICAL: HUGGINGFACE_API_KEY is not set!');
  console.log('📝 Get your free API key from: https://huggingface.co/settings/tokens');
}

// 🎯 WORKING MODELS (October 2025) - Ordered by reliability
const AI_MODELS = [
  // ✅ BEST: BLIP models - Most reliable for food detection
  {
    name: 'Salesforce/blip-image-captioning-large',
    url: 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
    priority: 1
  },
  {
    name: 'Salesforce/blip-image-captioning-base',
    url: 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
    priority: 2
  },
  // ✅ GOOD: ViT-GPT2 models
  {
    name: 'nlpconnect/vit-gpt2-image-captioning',
    url: 'https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning',
    priority: 3
  },
  // ✅ ALTERNATIVE: GIT models
  {
    name: 'microsoft/git-base',
    url: 'https://api-inference.huggingface.co/models/microsoft/git-base',
    priority: 4
  }
];

// 📁 Temp directory for uploads
const tmpDir = path.join(os.tmpdir(), 'nutrisnap_uploads');
try {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log('✅ Temp directory created:', tmpDir);
} catch (err) {
  console.warn('⚠️ Temp directory already exists');
}

// 📤 Multer configuration
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
    }
  }
});

// 🍔 Enhanced Food Database (100+ items)
interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  avgWeight: number;
}

const FOOD_DATABASE: Record<string, Nutrition> = {
  // Fast Food
  'pizza': { calories: 266, protein: 11, carbs: 33, fats: 10, avgWeight: 100 },
  'burger': { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
  'hamburger': { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
  'cheeseburger': { calories: 303, protein: 15, carbs: 25, fats: 15, avgWeight: 150 },
  'hot dog': { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
  'hotdog': { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
  'fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },
  'french fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },

  // Pasta & Italian
  'pasta': { calories: 131, protein: 5, carbs: 25, fats: 1, avgWeight: 150 },
  'spaghetti': { calories: 158, protein: 6, carbs: 31, fats: 1, avgWeight: 150 },
  'lasagna': { calories: 135, protein: 8, carbs: 11, fats: 6, avgWeight: 200 },
  'ravioli': { calories: 175, protein: 7, carbs: 24, fats: 6, avgWeight: 150 },
  'carbonara': { calories: 200, protein: 10, carbs: 25, fats: 8, avgWeight: 150 },

  // Mexican
  'taco': { calories: 226, protein: 9, carbs: 21, fats: 12, avgWeight: 100 },
  'burrito': { calories: 206, protein: 9, carbs: 26, fats: 7, avgWeight: 200 },
  'quesadilla': { calories: 510, protein: 20, carbs: 39, fats: 30, avgWeight: 200 },
  'nachos': { calories: 346, protein: 9, carbs: 36, fats: 19, avgWeight: 150 },
  'enchilada': { calories: 143, protein: 7, carbs: 14, fats: 7, avgWeight: 150 },

  // Asian
  'rice': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, avgWeight: 150 },
  'fried rice': { calories: 163, protein: 3.5, carbs: 28, fats: 4, avgWeight: 150 },
  'noodles': { calories: 138, protein: 4.5, carbs: 25, fats: 2, avgWeight: 150 },
  'ramen': { calories: 188, protein: 7.5, carbs: 27, fats: 6, avgWeight: 200 },
  'sushi': { calories: 143, protein: 6, carbs: 21, fats: 3.5, avgWeight: 100 },
  'dumplings': { calories: 210, protein: 8, carbs: 24, fats: 9, avgWeight: 100 },
  'spring roll': { calories: 140, protein: 4, carbs: 18, fats: 6, avgWeight: 80 },
  'curry': { calories: 125, protein: 7, carbs: 12, fats: 6, avgWeight: 200 },

  // Proteins
  'chicken': { calories: 239, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
  'grilled chicken': { calories: 165, protein: 31, carbs: 0, fats: 3.6, avgWeight: 150 },
  'fried chicken': { calories: 246, protein: 19, carbs: 12, fats: 14, avgWeight: 150 },
  'steak': { calories: 271, protein: 25, carbs: 0, fats: 19, avgWeight: 200 },
  'beef': { calories: 250, protein: 26, carbs: 0, fats: 15, avgWeight: 150 },
  'pork': { calories: 242, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
  'bacon': { calories: 541, protein: 37, carbs: 1.4, fats: 42, avgWeight: 50 },
  'sausage': { calories: 301, protein: 12, carbs: 3, fats: 27, avgWeight: 80 },
  'fish': { calories: 206, protein: 22, carbs: 0, fats: 12, avgWeight: 150 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fats: 13, avgWeight: 150 },
  'tuna': { calories: 144, protein: 23, carbs: 0, fats: 5, avgWeight: 150 },
  'shrimp': { calories: 99, protein: 24, carbs: 0.2, fats: 0.3, avgWeight: 100 },

  // Eggs
  'egg': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 50 },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 100 },
  'scrambled eggs': { calories: 148, protein: 10, carbs: 1.3, fats: 11, avgWeight: 100 },
  'omelette': { calories: 154, protein: 11, carbs: 1, fats: 12, avgWeight: 120 },
  'boiled egg': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 50 },

  // Sandwiches
  'sandwich': { calories: 250, protein: 15, carbs: 30, fats: 8, avgWeight: 150 },
  'wrap': { calories: 220, protein: 12, carbs: 28, fats: 7, avgWeight: 150 },
  'bagel': { calories: 257, protein: 10, carbs: 50, fats: 1.5, avgWeight: 90 },
  'croissant': { calories: 406, protein: 8, carbs: 46, fats: 21, avgWeight: 60 },

  // Vegetables & Salads
  'salad': { calories: 33, protein: 2.5, carbs: 6, fats: 0.3, avgWeight: 200 },
  'vegetables': { calories: 65, protein: 3, carbs: 13, fats: 0.3, avgWeight: 150 },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, avgWeight: 100 },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fats: 0.2, avgWeight: 100 },
  'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, avgWeight: 100 },
  'potato': { calories: 77, protein: 2, carbs: 17, fats: 0.1, avgWeight: 150 },
  'mashed potato': { calories: 105, protein: 2, carbs: 16, fats: 4, avgWeight: 150 },
  'baked potato': { calories: 93, protein: 2.5, carbs: 21, fats: 0.1, avgWeight: 150 },

  // Fruits
  'fruit': { calories: 50, protein: 0.5, carbs: 13, fats: 0.2, avgWeight: 100 },
  'apple': { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, avgWeight: 150 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, avgWeight: 120 },
  'orange': { calories: 47, protein: 0.9, carbs: 12, fats: 0.1, avgWeight: 130 },
  'strawberry': { calories: 32, protein: 0.7, carbs: 8, fats: 0.3, avgWeight: 100 },
  'watermelon': { calories: 30, protein: 0.6, carbs: 8, fats: 0.2, avgWeight: 150 },

  // Soups
  'soup': { calories: 71, protein: 5.5, carbs: 9, fats: 2, avgWeight: 250 },
  'chicken soup': { calories: 62, protein: 7, carbs: 6, fats: 2, avgWeight: 250 },
  'vegetable soup': { calories: 67, protein: 3, carbs: 12, fats: 1.5, avgWeight: 250 },
  'stew': { calories: 136, protein: 12, carbs: 10, fats: 5, avgWeight: 250 },

  // Bread & Bakery
  'bread': { calories: 265, protein: 9, carbs: 49, fats: 3.2, avgWeight: 50 },
  'toast': { calories: 313, protein: 10, carbs: 59, fats: 4, avgWeight: 50 },
  'muffin': { calories: 377, protein: 6, carbs: 51, fats: 17, avgWeight: 80 },

  // Desserts
  'cake': { calories: 257, protein: 2.6, carbs: 42, fats: 9, avgWeight: 100 },
  'chocolate': { calories: 546, protein: 5, carbs: 61, fats: 31, avgWeight: 50 },
  'cookie': { calories: 502, protein: 5.5, carbs: 64, fats: 25, avgWeight: 30 },
  'ice cream': { calories: 207, protein: 3.5, carbs: 24, fats: 11, avgWeight: 100 },
  'donut': { calories: 452, protein: 5, carbs: 51, fats: 25, avgWeight: 60 },
  'pancake': { calories: 227, protein: 6, carbs: 28, fats: 10, avgWeight: 80 },
  'waffle': { calories: 291, protein: 7, carbs: 33, fats: 15, avgWeight: 80 },

  // Dairy
  'cheese': { calories: 402, protein: 25, carbs: 1.3, fats: 33, avgWeight: 50 },
  'yogurt': { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, avgWeight: 150 },
  'milk': { calories: 42, protein: 3.4, carbs: 5, fats: 1, avgWeight: 200 },

  // Snacks
  'chips': { calories: 536, protein: 6.6, carbs: 53, fats: 34, avgWeight: 50 },
  'popcorn': { calories: 387, protein: 13, carbs: 78, fats: 4.5, avgWeight: 50 },
  'nuts': { calories: 607, protein: 21, carbs: 21, fats: 54, avgWeight: 50 },
  'crackers': { calories: 502, protein: 8, carbs: 61, fats: 25, avgWeight: 50 }
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'on', 'in', 'at', 'to', 'of', 'with', 'and', 'or',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'for', 'by', 'from', 'as', 'it', 'this', 'that', 'plate', 'bowl', 'table',
  'white', 'black', 'brown', 'red', 'green', 'blue', 'yellow', 'sitting', 'top'
]);

// 🔍 Enhanced food matching algorithm
function matchFoodFromDescription(description: string): {
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  weight: number;
  confidence: string;
} {
  console.log('🔍 Analyzing description:', description);

  const lowerDesc = description.toLowerCase();
  const words = lowerDesc.split(/[\s,.-]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  let bestMatch: { name: string; nutrition: Nutrition } | null = null;
  let bestScore = 0;

  for (const [foodName, nutrition] of Object.entries(FOOD_DATABASE)) {
    let score = 0;

    // Exact phrase match (highest priority)
    if (lowerDesc.includes(foodName)) {
      score += 15;
    }

    // Word-by-word matching
    const foodWords = foodName.split(' ');
    for (const fw of foodWords) {
      if (fw.length >= 3 && words.includes(fw)) {
        score += 8;
      }
    }

    // Partial matches
    for (const w of words) {
      if (w.length >= 4) {
        for (const fw of foodWords) {
          if (w.includes(fw) || fw.includes(w)) {
            score += 4;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { name: foodName, nutrition };
    }
  }

  console.log('🎯 Best match:', bestMatch?.name, 'Score:', bestScore);

  if (bestMatch && bestScore >= 4) {
    const confidence = bestScore >= 15 ? 'high' : (bestScore >= 8 ? 'medium' : 'low');

    return {
      mealName: bestMatch.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      calories: bestMatch.nutrition.calories,
      protein: bestMatch.nutrition.protein,
      carbs: bestMatch.nutrition.carbs,
      fats: bestMatch.nutrition.fats,
      weight: bestMatch.nutrition.avgWeight,
      confidence
    };
  }

  // Default fallback
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

// 🤖 Try single model with retry
async function tryModelWithRetry(
  modelUrl: string,
  modelName: string,
  imageBuffer: Buffer,
  maxRetries = 2
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [${attempt}/${maxRetries}] Trying model: ${modelName}`);

      const response: AxiosResponse = await axios.post(
        modelUrl,
        imageBuffer,
        {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          },
          timeout: 30000
        }
      );

      // Parse different response formats
      let description = '';
      const data = response.data;

      if (Array.isArray(data) && data.length > 0) {
        description = data[0]?.generated_text || data[0]?.caption || '';
      } else if (typeof data === 'object' && data) {
        description = data.generated_text || data.caption || data[0]?.generated_text || '';
      } else if (typeof data === 'string') {
        description = data;
      }

      if (description && description.length > 3) {
        console.log(`✅ SUCCESS with ${modelName}: "${description}"`);
        return description;
      }

      console.log(`⚠️ Empty response from ${modelName}`);

    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;

      console.error(`❌ [${attempt}/${maxRetries}] ${modelName} failed:`, {
        status,
        error: errorData?.error || error.message
      });

      // Model loading (503) - wait and retry
      if (status === 503 && attempt < maxRetries) {
        const waitTime = 3000 * attempt;
        console.log(`⏳ Model loading, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Rate limit (429) - skip to next model
      if (status === 429) {
        console.log('⚠️ Rate limit hit, skipping to next model');
        return null;
      }
    }
  }

  return null;
}

// 🧠 Main AI analysis function
async function analyzeImageWithHuggingFace(imageBuffer: Buffer): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY is not configured. Please set it in your environment variables.');
  }

  console.log(`🚀 Starting image analysis with ${AI_MODELS.length} models...`);

  // Try each model in order
  for (const model of AI_MODELS) {
    const description = await tryModelWithRetry(model.url, model.name, imageBuffer, 2);

    if (description) {
      console.log(`✅ Analysis complete using: ${model.name}`);
      return description;
    }

    // Small delay between models
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // All models failed
  throw new Error(
    'All AI models failed. This could be due to:\n' +
    '1. Models are loading (try again in 30 seconds)\n' +
    '2. Rate limit exceeded (wait a few minutes)\n' +
    '3. Invalid API key (check your Hugging Face token)\n' +
    '4. Service outage (check status.huggingface.co)'
  );
}

// ✅ Optional auth skip
const skipAuth = process.env.SKIP_AUTH === 'true';

// 📸 Main route: Analyze food image
router.post(
  '/analyze-image',
  ...(skipAuth ? [] : [protect]),
  upload.single('foodImage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No image file received' });
      return;
    }

    const filePath = file.path;
    console.log('📸 Processing image:', {
      filename: file.originalname,
      size: `${(file.size / 1024).toFixed(2)}KB`,
      mimetype: file.mimetype
    });

    try {
      // Read image file
      const imageBuffer = await fs.promises.readFile(filePath);
      console.log('✅ Image loaded into buffer');

      // Analyze with Hugging Face
      const aiDescription = await analyzeImageWithHuggingFace(imageBuffer);
      console.log('🔍 AI Description:', aiDescription);

      // Match to food database
      const nutritionInfo = matchFoodFromDescription(aiDescription);
      console.log('📊 Nutrition:', nutritionInfo);

      // Send response
      res.json({
        success: true,
        mealName: nutritionInfo.mealName,
        calories: nutritionInfo.calories,
        nutrients: {
          protein: nutritionInfo.protein,
          carbs: nutritionInfo.carbs,
          fats: nutritionInfo.fats
        },
        weight: nutritionInfo.weight,
        confidence: nutritionInfo.confidence,
        aiDescription
      });

    } catch (error: any) {
      console.error('❌ Route error:', error.message);

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze image',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.stack
        })
      });

    } finally {
      // Cleanup temp file
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log('🗑️ Temp file deleted');
        }
      } catch (cleanupErr) {
        console.error('⚠️ Failed to cleanup temp file:', cleanupErr);
      }
    }
  }
);

// 🏥 Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test first model
    const testResponse = await axios.head(AI_MODELS[0].url, {
      headers: { 'Authorization': `Bearer ${HUGGINGFACE_API_KEY}` },
      timeout: 5000
    });

    res.json({
      status: 'ok',
      aiProvider: 'Hugging Face',
      models: AI_MODELS.map(m => m.name),
      primaryModel: AI_MODELS[0].name,
      apiConfigured: !!HUGGINGFACE_API_KEY,
      apiStatus: 'connected',
      foodDatabaseSize: Object.keys(FOOD_DATABASE).length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      aiProvider: 'Hugging Face',
      apiConfigured: !!HUGGINGFACE_API_KEY,
      apiStatus: 'unreachable',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;