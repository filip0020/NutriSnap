import express, { Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import axios from 'axios';

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

// Funcție simplificată pentru analiza alimentelor
function estimateFoodNutrition(keywords: string[]): any {
  const foodDatabase: { [key: string]: { calories: number, protein: number, carbs: number, fats: number } } = {
    'pizza': { calories: 800, protein: 30, carbs: 90, fats: 35 },
    'burger': { calories: 650, protein: 35, carbs: 45, fats: 35 },
    'pasta': { calories: 400, protein: 15, carbs: 70, fats: 8 },
    'spaghetti': { calories: 400, protein: 15, carbs: 70, fats: 8 },
    'salad': { calories: 150, protein: 8, carbs: 15, fats: 8 },
    'sandwich': { calories: 350, protein: 20, carbs: 40, fats: 12 },
    'rice': { calories: 350, protein: 7, carbs: 75, fats: 2 },
    'chicken': { calories: 450, protein: 45, carbs: 5, fats: 25 },
    'fish': { calories: 350, protein: 40, carbs: 0, fats: 18 },
    'soup': { calories: 200, protein: 10, carbs: 25, fats: 6 },
    'bread': { calories: 250, protein: 8, carbs: 48, fats: 3 },
    'cake': { calories: 450, protein: 5, carbs: 60, fats: 20 },
    'fruit': { calories: 100, protein: 1, carbs: 25, fats: 0 },
    'apple': { calories: 95, protein: 0, carbs: 25, fats: 0 },
    'banana': { calories: 105, protein: 1, carbs: 27, fats: 0 },
    'orange': { calories: 62, protein: 1, carbs: 15, fats: 0 },
    'vegetables': { calories: 80, protein: 3, carbs: 15, fats: 1 },
    'meat': { calories: 500, protein: 40, carbs: 0, fats: 35 },
    'beef': { calories: 550, protein: 45, carbs: 0, fats: 40 },
    'pork': { calories: 480, protein: 42, carbs: 0, fats: 32 },
    'egg': { calories: 150, protein: 13, carbs: 1, fats: 10 },
    'eggs': { calories: 150, protein: 13, carbs: 1, fats: 10 },
    'cheese': { calories: 400, protein: 25, carbs: 2, fats: 33 },
    'yogurt': { calories: 150, protein: 8, carbs: 17, fats: 5 },
    'potato': { calories: 300, protein: 6, carbs: 65, fats: 1 },
    'fries': { calories: 500, protein: 6, carbs: 60, fats: 25 },
    'dessert': { calories: 400, protein: 4, carbs: 55, fats: 18 },
    'coffee': { calories: 5, protein: 0, carbs: 1, fats: 0 },
    'tea': { calories: 2, protein: 0, carbs: 0, fats: 0 },
    'juice': { calories: 120, protein: 0, carbs: 28, fats: 0 },
    'milk': { calories: 150, protein: 8, carbs: 12, fats: 8 },
    'water': { calories: 0, protein: 0, carbs: 0, fats: 0 },
    'steak': { calories: 600, protein: 50, carbs: 0, fats: 42 },
    'chocolate': { calories: 550, protein: 5, carbs: 60, fats: 30 },
    'cookie': { calories: 150, protein: 2, carbs: 20, fats: 7 },
    'ice cream': { calories: 350, protein: 5, carbs: 45, fats: 18 },
    'pancake': { calories: 400, protein: 10, carbs: 60, fats: 12 },
    'waffle': { calories: 420, protein: 12, carbs: 58, fats: 15 },
    'burrito': { calories: 700, protein: 30, carbs: 80, fats: 25 },
    'taco': { calories: 350, protein: 18, carbs: 35, fats: 15 },
    'sushi': { calories: 350, protein: 20, carbs: 50, fats: 8 },
    'noodles': { calories: 400, protein: 12, carbs: 75, fats: 6 },
    'curry': { calories: 450, protein: 25, carbs: 50, fats: 18 },
    'kebab': { calories: 550, protein: 35, carbs: 40, fats: 28 }
  };

  // Căutăm cel mai bun match
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [food, nutrition] of Object.entries(foodDatabase)) {
      if (lowerKeyword.includes(food) || food.includes(lowerKeyword)) {
        return {
          mealName: food.charAt(0).toUpperCase() + food.slice(1),
          ...nutrition
        };
      }
    }
  }

  // Valori default dacă nu găsim nimic
  return {
    mealName: 'Mâncare',
    calories: 350,
    protein: 15,
    carbs: 45,
    fats: 12
  };
}

// Funcție pentru a analiza cu Hugging Face (cu fallback)
async function analyzeWithHuggingFace(imageBuffer: Buffer): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    console.warn('⚠️ Nu există API Key pentru Hugging Face, folosim fallback');
    return 'food plate';
  }

  try {
    const API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

    console.log('📤 Trimitere către Hugging Face...');

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

    console.log('✅ Răspuns Hugging Face:', response.data);

    const description = Array.isArray(response.data)
      ? response.data[0]?.generated_text
      : response.data.generated_text;

    return description || 'food';

  } catch (error: any) {
    console.error('❌ Eroare Hugging Face:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Dacă modelul se încarcă (503), returnăm descriere simplă
    if (error.response?.status === 503) {
      console.log('⏳ Modelul se încarcă, folosim estimare simplă');
      return 'food plate';
    }

    // Pentru alte erori, returnăm și noi o descriere simplă
    return 'meal';
  }
}

router.post(
  '/analyze-image',
  upload.single('foodImage'),
  async (req: Request, res: Response): Promise<void> => {
    console.log('📸 ===== ANALYZE IMAGE REQUEST =====');
    console.log('📁 File:', req.file ? 'Received ✅' : 'Missing ❌');

    if (!req.file) {
      console.error('❌ Niciun fișier primit');
      res.status(400).json({ message: 'Niciun fișier primit.' });
      return;
    }

    const filePath = req.file.path;
    console.log('📁 File path:', filePath);
    console.log('📊 File info:', {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    try {
      // Citim imaginea
      const imageBuffer = fs.readFileSync(filePath);
      console.log('✅ Imagine citită, size:', imageBuffer.length, 'bytes');

      // Încercăm să analizăm cu Hugging Face
      let description = 'food';

      try {
        description = await analyzeWithHuggingFace(imageBuffer);
        console.log('📝 Descriere AI:', description);
      } catch (error) {
        console.warn('⚠️ Nu am putut folosi AI, folosim estimare simplă');
      }

      // Extragem cuvinte cheie din descriere
      const keywords = description.toLowerCase().split(/[\s,.-]+/);
      console.log('🔍 Keywords:', keywords);

      // Estimăm nutriția
      const nutritionInfo = estimateFoodNutrition(keywords);
      console.log('📊 Nutrition info:', nutritionInfo);

      // Curățăm fișierul
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Fișier șters');
      }

      // Formatăm rezultatul
      const result = {
        mealName: nutritionInfo.mealName,
        calories: nutritionInfo.calories,
        nutrients: {
          protein: nutritionInfo.protein,
          carbs: nutritionInfo.carbs,
          fats: nutritionInfo.fats
        },
        aiDescription: description
      };

      console.log('✅ ===== SUCCESS =====');
      console.log('📤 Rezultat:', result);

      res.json(result);

    } catch (error: any) {
      console.error('❌ ===== ERROR =====');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Curățăm fișierul
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Fișier șters (după eroare)');
        }
      } catch (cleanupError) {
        console.error('❌ Eroare la ștergere fișier:', cleanupError);
      }

      // Returnăm eroare dar cu date default pentru a nu bloca UI-ul
      res.status(200).json({
        mealName: 'Mâncare',
        calories: 400,
        nutrients: {
          protein: 20,
          carbs: 50,
          fats: 15
        },
        aiDescription: 'Estimare bazată pe imagine',
        warning: 'AI nu a putut analiza imaginea complet, folosim estimări generale'
      });
    }
  }
);

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: 'Hugging Face (with fallback)',
    apiConfigured: !!HUGGINGFACE_API_KEY,
    model: 'Salesforce/blip-image-captioning-large',
    timestamp: new Date().toISOString()
  });
});

export default router;