import express, { Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import axios from 'axios';
import protect from '../middleware/auth';  // ✅ ADD THIS
import { AuthRequest } from '../models/User';  // ✅ ADD THIS

const router = express.Router();

// Configurare multer
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tip de fișier invalid. Doar JPEG, PNG, WEBP sunt permise.'));
    }
  }
});

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

console.log('🔑 Hugging Face API Key status:', HUGGINGFACE_API_KEY ? 'SET ✅' : 'NOT SET ❌');

// Bază de date extinsă cu alimente
const foodDatabase: { [key: string]: { calories: number, protein: number, carbs: number, fats: number, avgWeight: number } } = {
  // Fast food & Pizza
  'pizza': { calories: 266, protein: 11, carbs: 33, fats: 10, avgWeight: 100 },
  'burger': { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
  'hamburger': { calories: 295, protein: 17, carbs: 24, fats: 14, avgWeight: 150 },
  'cheeseburger': { calories: 303, protein: 15, carbs: 25, fats: 15, avgWeight: 150 },
  'hot dog': { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
  'hotdog': { calories: 290, protein: 10, carbs: 24, fats: 17, avgWeight: 100 },
  'fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },
  'french fries': { calories: 312, protein: 3.4, carbs: 41, fats: 15, avgWeight: 100 },

  // Paste & Italian
  'pasta': { calories: 131, protein: 5, carbs: 25, fats: 1, avgWeight: 150 },
  'spaghetti': { calories: 158, protein: 6, carbs: 31, fats: 1, avgWeight: 150 },
  'lasagna': { calories: 135, protein: 8, carbs: 11, fats: 6, avgWeight: 200 },
  'ravioli': { calories: 175, protein: 7, carbs: 24, fats: 6, avgWeight: 150 },

  // Sandwiches & Wraps
  'sandwich': { calories: 250, protein: 15, carbs: 30, fats: 8, avgWeight: 150 },
  'wrap': { calories: 220, protein: 12, carbs: 28, fats: 7, avgWeight: 150 },
  'burrito': { calories: 206, protein: 9, carbs: 26, fats: 7, avgWeight: 200 },
  'taco': { calories: 226, protein: 9, carbs: 21, fats: 12, avgWeight: 100 },

  // Rice & Grains
  'rice': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, avgWeight: 150 },
  'fried rice': { calories: 163, protein: 3.5, carbs: 28, fats: 4, avgWeight: 150 },
  'risotto': { calories: 143, protein: 3, carbs: 22, fats: 4, avgWeight: 150 },
  'quinoa': { calories: 120, protein: 4.4, carbs: 21, fats: 1.9, avgWeight: 100 },

  // Meat & Protein
  'chicken': { calories: 239, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
  'grilled chicken': { calories: 165, protein: 31, carbs: 0, fats: 3.6, avgWeight: 150 },
  'fried chicken': { calories: 246, protein: 19, carbs: 12, fats: 14, avgWeight: 150 },
  'steak': { calories: 271, protein: 25, carbs: 0, fats: 19, avgWeight: 200 },
  'beef': { calories: 250, protein: 26, carbs: 0, fats: 15, avgWeight: 150 },
  'pork': { calories: 242, protein: 27, carbs: 0, fats: 14, avgWeight: 150 },
  'lamb': { calories: 294, protein: 25, carbs: 0, fats: 21, avgWeight: 150 },
  'bacon': { calories: 541, protein: 37, carbs: 1.4, fats: 42, avgWeight: 50 },
  'sausage': { calories: 301, protein: 12, carbs: 3, fats: 27, avgWeight: 80 },

  // Fish & Seafood
  'fish': { calories: 206, protein: 22, carbs: 0, fats: 12, avgWeight: 150 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fats: 13, avgWeight: 150 },
  'tuna': { calories: 144, protein: 23, carbs: 0, fats: 5, avgWeight: 150 },
  'shrimp': { calories: 99, protein: 24, carbs: 0.2, fats: 0.3, avgWeight: 100 },
  'sushi': { calories: 143, protein: 6, carbs: 21, fats: 3.5, avgWeight: 100 },

  // Eggs & Dairy
  'egg': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 50 },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fats: 11, avgWeight: 100 },
  'scrambled eggs': { calories: 148, protein: 10, carbs: 1.3, fats: 11, avgWeight: 100 },
  'omelette': { calories: 154, protein: 11, carbs: 1, fats: 12, avgWeight: 120 },
  'cheese': { calories: 402, protein: 25, carbs: 1.3, fats: 33, avgWeight: 50 },
  'yogurt': { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, avgWeight: 150 },
  'milk': { calories: 42, protein: 3.4, carbs: 5, fats: 1, avgWeight: 200 },

  // Vegetables
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

  // Soups & Stews
  'soup': { calories: 71, protein: 5.5, carbs: 9, fats: 2, avgWeight: 250 },
  'chicken soup': { calories: 62, protein: 7, carbs: 6, fats: 2, avgWeight: 250 },
  'vegetable soup': { calories: 67, protein: 3, carbs: 12, fats: 1.5, avgWeight: 250 },
  'stew': { calories: 136, protein: 12, carbs: 10, fats: 5, avgWeight: 250 },

  // Bread & Bakery
  'bread': { calories: 265, protein: 9, carbs: 49, fats: 3.2, avgWeight: 50 },
  'toast': { calories: 313, protein: 10, carbs: 59, fats: 4, avgWeight: 50 },
  'bagel': { calories: 257, protein: 10, carbs: 50, fats: 1.5, avgWeight: 90 },
  'croissant': { calories: 406, protein: 8, carbs: 46, fats: 21, avgWeight: 60 },
  'muffin': { calories: 377, protein: 6, carbs: 51, fats: 17, avgWeight: 80 },

  // Desserts
  'cake': { calories: 257, protein: 2.6, carbs: 42, fats: 9, avgWeight: 100 },
  'chocolate': { calories: 546, protein: 5, carbs: 61, fats: 31, avgWeight: 50 },
  'cookie': { calories: 502, protein: 5.5, carbs: 64, fats: 25, avgWeight: 30 },
  'ice cream': { calories: 207, protein: 3.5, carbs: 24, fats: 11, avgWeight: 100 },
  'donut': { calories: 452, protein: 5, carbs: 51, fats: 25, avgWeight: 60 },
  'pancake': { calories: 227, protein: 6, carbs: 28, fats: 10, avgWeight: 80 },
  'waffle': { calories: 291, protein: 7, carbs: 33, fats: 15, avgWeight: 80 },

  // Asian Food
  'noodles': { calories: 138, protein: 4.5, carbs: 25, fats: 2, avgWeight: 150 },
  'ramen': { calories: 188, protein: 7.5, carbs: 27, fats: 6, avgWeight: 200 },
  'curry': { calories: 125, protein: 7, carbs: 12, fats: 6, avgWeight: 200 },
  'dumplings': { calories: 210, protein: 8, carbs: 24, fats: 9, avgWeight: 100 },
  'spring roll': { calories: 140, protein: 4, carbs: 18, fats: 6, avgWeight: 80 },

  // Mexican
  'enchilada': { calories: 143, protein: 7, carbs: 14, fats: 7, avgWeight: 150 },
  'quesadilla': { calories: 510, protein: 20, carbs: 39, fats: 30, avgWeight: 200 },
  'nachos': { calories: 346, protein: 9, carbs: 36, fats: 19, avgWeight: 150 },

  // Middle Eastern
  'kebab': { calories: 178, protein: 18, carbs: 5, fats: 10, avgWeight: 150 },
  'falafel': { calories: 333, protein: 13, carbs: 32, fats: 18, avgWeight: 100 },
  'hummus': { calories: 166, protein: 8, carbs: 14, fats: 10, avgWeight: 100 },
  'shawarma': { calories: 260, protein: 25, carbs: 10, fats: 14, avgWeight: 150 },

  // Beverages
  'coffee': { calories: 2, protein: 0.3, carbs: 0, fats: 0, avgWeight: 200 },
  'tea': { calories: 1, protein: 0, carbs: 0.3, fats: 0, avgWeight: 200 },
  'juice': { calories: 45, protein: 0.5, carbs: 11, fats: 0.1, avgWeight: 200 },
  'smoothie': { calories: 145, protein: 3, carbs: 30, fats: 2, avgWeight: 250 },

  // Snacks
  'chips': { calories: 536, protein: 6.6, carbs: 53, fats: 34, avgWeight: 50 },
  'popcorn': { calories: 387, protein: 13, carbs: 78, fats: 4.5, avgWeight: 50 },
  'nuts': { calories: 607, protein: 21, carbs: 21, fats: 54, avgWeight: 50 },
  'crackers': { calories: 502, protein: 8, carbs: 61, fats: 25, avgWeight: 50 }
};

// Funcție pentru a estima greutatea bazată pe context
function estimateWeight(description: string, baseWeight: number): number {
  const lowerDesc = description.toLowerCase();

  // Indicatori de dimensiune
  const sizeIndicators: { [key: string]: number } = {
    'large': 1.5,
    'big': 1.5,
    'huge': 2.0,
    'small': 0.7,
    'tiny': 0.5,
    'medium': 1.0,
    'plate': 1.3,
    'bowl': 1.2,
    'cup': 0.8,
    'slice': 0.4,
    'piece': 0.6,
    'serving': 1.0,
    'portion': 1.0
  };

  // Verificăm dacă există indicatori de dimensiune
  for (const [indicator, multiplier] of Object.entries(sizeIndicators)) {
    if (lowerDesc.includes(indicator)) {
      return Math.round(baseWeight * multiplier);
    }
  }

  // Dacă găsim multiple items (e.g., "two pizzas", "three burgers")
  const numberWords: { [key: string]: number } = {
    'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'couple': 2, 'several': 3, 'few': 2
  };

  for (const [word, multiplier] of Object.entries(numberWords)) {
    if (lowerDesc.includes(word)) {
      return Math.round(baseWeight * multiplier);
    }
  }

  return baseWeight;
}

// Funcție îmbunătățită pentru analiza alimentelor
function analyzeFoodFromDescription(description: string): any {
  console.log('🔍 Analizare descriere:', description);

  const lowerDesc = description.toLowerCase();
  const words = lowerDesc.split(/[\s,.-]+/);

  let bestMatch: any = null;
  let bestScore = 0;

  // Căutăm cel mai bun match
  for (const [foodName, nutrition] of Object.entries(foodDatabase)) {
    let score = 0;

    // Match exact
    if (lowerDesc.includes(foodName)) {
      score += 10;
    }

    // Match parțial pe cuvinte
    const foodWords = foodName.split(' ');
    for (const foodWord of foodWords) {
      if (words.includes(foodWord)) {
        score += 5;
      }
    }

    // Match fuzzy pentru variante
    for (const word of words) {
      if (foodName.includes(word) || word.includes(foodName)) {
        score += 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { foodName, ...nutrition };
    }
  }

  console.log('🎯 Best match:', bestMatch?.foodName, 'Score:', bestScore);

  if (bestMatch && bestScore >= 3) {
    // Estimăm greutatea bazată pe contextul din descriere
    const estimatedWeight = estimateWeight(description, bestMatch.avgWeight);

    // Calculăm nutrienții proporțional cu greutatea
    const weightRatio = estimatedWeight / 100; // Valorile sunt per 100g

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

  // Dacă nu găsim nimic, returnăm estimare generică
  console.log('⚠️ Nu s-a găsit match, folosim estimare generică');
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

// Funcție pentru a analiza cu Hugging Face
async function analyzeWithHuggingFace(imageBuffer: Buffer, retries = 3): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('API Key lipsește');
  }

  const API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`📤 Attempt ${i + 1}/${retries} to Hugging Face...`);

      const response = await axios.post(
        API_URL,
        imageBuffer,
        {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          },
          timeout: 30000
        }
      );

      console.log('✅ Hugging Face response:', response.data);

      const description = Array.isArray(response.data)
        ? response.data[0]?.generated_text
        : response.data.generated_text;

      if (!description) {
        throw new Error('Nu s-a primit descriere de la AI');
      }

      return description;

    } catch (error: any) {
      console.error(`❌ Attempt ${i + 1} failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      });

      // If model is loading (503), wait longer
      if (error.response?.status === 503) {
        if (i < retries - 1) {
          const waitTime = Math.min(20000 * (i + 1), 60000);
          console.log(`⏳ Model loading, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error('Modelul AI se încarcă. Încearcă din nou în 1-2 minute.');
      }

      // For other errors, throw immediately
      if (i === retries - 1) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error('Failed after all retries');
}


// ✅ ADDED PROTECTION - Requires authentication
router.post(
  '/analyze-image',
  protect,
  upload.single('foodImage'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    console.log('📸 ===== ANALYZE IMAGE REQUEST =====');
    console.log('👤 User ID:', req.user?.id);
    console.log('📁 File:', req.file ? 'Received ✅' : 'Missing ❌');
    console.log('📝 Body keys:', Object.keys(req.body));
    console.log('🔑 Headers:', req.headers.authorization ? 'Present' : 'Missing');

    if (!req.file) {
      console.error('❌ Niciun fișier primit');
      res.status(400).json({ message: 'Niciun fișier primit.' });
      return;
    }

    const filePath = req.file.path;

    try {
      const imageBuffer = fs.readFileSync(filePath);
      console.log('✅ Imagine citită, size:', imageBuffer.length, 'bytes');

      const description = await analyzeWithHuggingFace(imageBuffer);
      console.log('🔍 Descriere AI:', description);

      // ... rest of code
    } catch (error: any) {
      console.error('❌ ===== DETAILED ERROR =====');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);

      // Cleanup file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('❌ Cleanup error:', cleanupError);
      }

      res.status(500).json({
        message: error.message || 'Eroare la analizarea imaginii',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Health check - NO AUTH NEEDED
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: 'Hugging Face',
    apiConfigured: !!HUGGINGFACE_API_KEY,
    model: 'Salesforce/blip-image-captioning-large',
    foodDatabaseSize: Object.keys(foodDatabase).length,
    timestamp: new Date().toISOString()
  });
});

export default router;