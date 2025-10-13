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

console.log('='.repeat(60));
console.log('🔑 HUGGING FACE API KEY CHECK:');
console.log('Environment:', process.env.NODE_ENV);
console.log('API Key Set:', !!HUGGINGFACE_API_KEY);
console.log('API Key Length:', HUGGINGFACE_API_KEY.length);
console.log('API Key Preview:', HUGGINGFACE_API_KEY ? `${HUGGINGFACE_API_KEY.substring(0, 15)}...` : 'NOT SET ❌');
console.log('Starts with hf_:', HUGGINGFACE_API_KEY.startsWith('hf_'));
console.log('='.repeat(60));

if (!HUGGINGFACE_API_KEY) {
  console.error('❌ CRITICAL: HUGGINGFACE_API_KEY is NOT SET!');
  console.log('📝 Add it to Render: Dashboard → Environment → Add Variable');
  console.log('   Key: HUGGINGFACE_API_KEY');
  console.log('   Value: hf_your_token_here');
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
  console.log('✅ Temp directory:', tmpDir);
} catch {
  console.log('⚠️ Temp dir exists');
}

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
  console.log('🔍 Analyzing description:', desc);

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

  console.log('🎯 Best match:', best?.name || 'none', 'Score:', score);

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

// 🤖 Call HF API with detailed logging
async function analyzeWithHF(buffer: Buffer): Promise<string> {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STARTING HUGGING FACE API CALL');
  console.log('='.repeat(60));

  if (!HUGGINGFACE_API_KEY) {
    console.error('❌ FATAL: No API key!');
    throw new Error(
      '❌ HUGGINGFACE_API_KEY not configured!\n\n' +
      'SOLUTION:\n' +
      '1. Go to: https://huggingface.co/settings/tokens\n' +
      '2. Create a new token (Read access)\n' +
      '3. Go to Render Dashboard → Your Service → Environment\n' +
      '4. Add: HUGGINGFACE_API_KEY = hf_your_token\n' +
      '5. Save and redeploy'
    );
  }

  console.log(`✅ API Key is set (length: ${HUGGINGFACE_API_KEY.length})`);
  console.log(`📋 Will try ${AI_MODELS.length} models`);
  console.log('Buffer size:', (buffer.length / 1024).toFixed(2), 'KB');

  const errors: string[] = [];

  for (let modelIndex = 0; modelIndex < AI_MODELS.length; modelIndex++) {
    const model = AI_MODELS[modelIndex];
    console.log(`\n[${modelIndex + 1}/${AI_MODELS.length}] Model: ${model}`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`  🔄 Attempt ${attempt}/2`);

        const url = `https://api-inference.huggingface.co/models/${model}`;
        console.log(`  📡 URL: ${url}`);
        console.log(`  🔑 Auth: Bearer ${HUGGINGFACE_API_KEY.substring(0, 10)}...`);

        const startTime = Date.now();
        const resp: AxiosResponse = await axios.post(url, buffer, {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          },
          timeout: 60000,
          validateStatus: () => true // Don't throw on any status
        });

        const elapsed = Date.now() - startTime;
        console.log(`  ⏱️ Response time: ${elapsed}ms`);
        console.log(`  📊 Status: ${resp.status}`);
        console.log(`  📦 Data type: ${typeof resp.data}`);
        console.log(`  📦 Data preview:`, JSON.stringify(resp.data).substring(0, 200));

        // Check for errors
        if (resp.status === 401) {
          console.error('  ❌ 401: Invalid API key!');
          errors.push(`${model}: Invalid API key (401)`);
          throw new Error(
            '❌ Invalid Hugging Face API Key!\n\n' +
            'Your API key is not valid or has expired.\n\n' +
            'SOLUTION:\n' +
            '1. Go to: https://huggingface.co/settings/tokens\n' +
            '2. Generate a NEW token (Read access)\n' +
            '3. Update in Render: Environment → HUGGINGFACE_API_KEY\n' +
            '4. Make sure it starts with "hf_"'
          );
        }

        if (resp.status === 403) {
          console.error('  ❌ 403: Access forbidden!');
          errors.push(`${model}: Access forbidden (403)`);
          continue;
        }

        if (resp.status === 429) {
          console.error('  ❌ 429: Rate limit!');
          errors.push(`${model}: Rate limit (429)`);
          throw new Error(
            '⏱️ Rate Limit Exceeded!\n\n' +
            'You have made too many requests.\n\n' +
            'SOLUTION:\n' +
            '1. Wait 5-10 minutes\n' +
            '2. Try again\n' +
            '3. Consider upgrading your Hugging Face plan for more requests'
          );
        }

        if (resp.status === 503) {
          console.log('  ⏳ 503: Model is loading...');
          if (attempt === 1) {
            console.log('  ⏳ Waiting 8 seconds for model to load...');
            await new Promise(r => setTimeout(r, 8000));
            continue;
          }
          errors.push(`${model}: Model loading timeout (503)`);
          continue;
        }

        if (resp.status !== 200) {
          console.error(`  ❌ Unexpected status: ${resp.status}`);
          errors.push(`${model}: HTTP ${resp.status}`);
          continue;
        }

        // Parse response
        let desc = '';
        const data = resp.data;

        if (Array.isArray(data) && data.length > 0) {
          desc = data[0]?.generated_text || data[0]?.caption || '';
          console.log('  📝 Parsed from array[0]');
        } else if (data && typeof data === 'object') {
          desc = data.generated_text || data.caption || '';
          console.log('  📝 Parsed from object');
        } else if (typeof data === 'string') {
          desc = data;
          console.log('  📝 Direct string');
        }

        console.log(`  📝 Description: "${desc}"`);
        console.log(`  📏 Length: ${desc.length}`);

        if (desc && desc.length > 3) {
          console.log('  ✅ SUCCESS!');
          console.log('='.repeat(60));
          return desc;
        }

        console.log('  ⚠️ Empty response');
        errors.push(`${model}: Empty response`);

      } catch (err: any) {
        const status = err?.response?.status;
        const errorMsg = err?.response?.data?.error || err.message;

        console.error(`  ❌ Exception:`, {
          status,
          message: errorMsg,
          code: err.code
        });

        errors.push(`${model}: ${errorMsg}`);

        // If it's a fatal error, throw immediately
        if (err.message.includes('Invalid') || err.message.includes('Rate Limit')) {
          throw err;
        }

        if (status === 503 && attempt === 1) {
          console.log('  ⏳ Retrying after delay...');
          await new Promise(r => setTimeout(r, 8000));
          continue;
        }
      }
    }

    // Delay between models
    if (modelIndex < AI_MODELS.length - 1) {
      console.log('  ⏸️ Pausing 2s before next model...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.error('❌ ALL MODELS FAILED!');
  console.error('Errors:', errors);
  console.log('='.repeat(60));

  throw new Error(
    '❌ All AI models failed!\n\n' +
    'Errors:\n' + errors.join('\n') + '\n\n' +
    'SOLUTIONS:\n' +
    '1. Check Render logs for detailed error info\n' +
    '2. Verify API key starts with "hf_"\n' +
    '3. Wait 30-60 seconds (models might be loading)\n' +
    '4. Try again - free tier has rate limits\n' +
    '5. Check: https://status.huggingface.co'
  );
}

const skipAuth = process.env.SKIP_AUTH === 'true';

// 📸 Main route
router.post(
  '/analyze-image',
  ...(skipAuth ? [] : [protect]),
  upload.single('foodImage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const requestId = Date.now();
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`📸 NEW REQUEST [${requestId}]`);
    console.log(`${'#'.repeat(60)}`);

    const file = req.file;

    if (!file) {
      console.error('❌ No file received');
      res.status(400).json({ success: false, message: 'No image file received' });
      return;
    }

    const filePath = file.path;
    console.log('📁 File:', file.originalname);
    console.log('📏 Size:', (file.size / 1024).toFixed(2), 'KB');
    console.log('🎨 Type:', file.mimetype);
    console.log('📂 Path:', filePath);

    try {
      const buffer = await fs.promises.readFile(filePath);
      console.log('✅ Buffer loaded:', (buffer.length / 1024).toFixed(2), 'KB');

      const desc = await analyzeWithHF(buffer);
      console.log('✅ AI Analysis complete:', desc);

      const info = matchFood(desc);
      console.log('✅ Food matched:', info);

      const response = {
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
      };

      console.log('✅ Sending success response');
      console.log(`${'#'.repeat(60)}\n`);
      res.json(response);

    } catch (error: any) {
      console.error('❌ ERROR:', error.message);
      console.error('Stack:', error.stack);
      console.log(`${'#'.repeat(60)}\n`);

      res.status(500).json({
        success: false,
        message: error.message || 'Image analysis failed'
      });

    } finally {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log('🗑️ Cleanup: file deleted');
        }
      } catch (err) {
        console.error('⚠️ Cleanup failed:', err);
      }
    }
  }
);

// 🏥 Health with detailed diagnostics
router.get('/health', async (req: Request, res: Response) => {
  console.log('🏥 Health check requested');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiProvider: 'Hugging Face',
    api: {
      configured: !!HUGGINGFACE_API_KEY,
      keyLength: HUGGINGFACE_API_KEY.length,
      keyPreview: HUGGINGFACE_API_KEY ? `${HUGGINGFACE_API_KEY.substring(0, 15)}...` : 'NOT SET ❌',
      startsWithHf: HUGGINGFACE_API_KEY.startsWith('hf_')
    },
    models: AI_MODELS,
    database: {
      foodItems: Object.keys(FOOD_DATABASE).length
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    }
  };

  console.log('Health status:', health);
  res.json(health);
});

// 🧪 Test endpoint to verify API key
router.get('/test-api-key', async (req: Request, res: Response): Promise<void> => {
  console.log('🧪 API Key test requested');

  if (!HUGGINGFACE_API_KEY) {
    res.status(500).json({
      error: 'API key not set',
      solution: 'Add HUGGINGFACE_API_KEY to Render environment variables'
    });
    return;
  }

  try {
    const testUrl = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';
    const response = await axios.get(testUrl, {
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`
      },
      timeout: 10000
    });

    res.json({
      success: true,
      message: 'API key is valid!',
      status: response.status,
      model: 'Salesforce/blip-image-captioning-base'
    });
    return;

  } catch (err: any) {
    const status = err?.response?.status;
    const errorData = err?.response?.data;

    res.status(500).json({
      success: false,
      error: 'API key test failed',
      status,
      message: errorData?.error || err.message,
      solution: status === 401
        ? 'Invalid API key - generate a new one'
        : 'Unknown error'
    });
    return;
  }
});


export default router;