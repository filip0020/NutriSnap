import express, { Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import FormData from 'form-data';
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

if (!HUGGINGFACE_API_KEY) {
  console.error('⚠️ ATENȚIE: HUGGINGFACE_API_KEY nu este setat în environment variables!');
}

// Funcție pentru analiza cu Hugging Face
async function analyzeImageWithHuggingFace(imageBuffer: Buffer): Promise<any> {
  try {
    // Folosim modelul BLIP pentru image captioning
    const API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

    const response = await axios.post(
      API_URL,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/octet-stream'
        }
      }
    );

    console.log('🤖 Răspuns de la Hugging Face:', response.data);

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 503) {
      // Modelul se încarcă, așteptăm și reîncercăm
      console.log('⏳ Modelul se încarcă, așteptăm 20 secunde...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      return analyzeImageWithHuggingFace(imageBuffer);
    }
    throw error;
  }
}

// Funcție pentru a extrage informații nutriționale din descriere
function extractNutritionalInfo(description: string): any {
  const lowerDesc = description.toLowerCase();

  // Dicționar simplu de alimente comune și valorile lor
  const foodDatabase: { [key: string]: { calories: number, protein: number, carbs: number, fats: number } } = {
    'pizza': { calories: 800, protein: 30, carbs: 90, fats: 35 },
    'burger': { calories: 650, protein: 35, carbs: 45, fats: 35 },
    'pasta': { calories: 400, protein: 15, carbs: 70, fats: 8 },
    'salad': { calories: 150, protein: 8, carbs: 15, fats: 8 },
    'sandwich': { calories: 350, protein: 20, carbs: 40, fats: 12 },
    'rice': { calories: 350, protein: 7, carbs: 75, fats: 2 },
    'chicken': { calories: 450, protein: 45, carbs: 5, fats: 25 },
    'fish': { calories: 350, protein: 40, carbs: 0, fats: 18 },
    'soup': { calories: 200, protein: 10, carbs: 25, fats: 6 },
    'bread': { calories: 250, protein: 8, carbs: 48, fats: 3 },
    'cake': { calories: 450, protein: 5, carbs: 60, fats: 20 },
    'fruit': { calories: 100, protein: 1, carbs: 25, fats: 0 },
    'vegetables': { calories: 80, protein: 3, carbs: 15, fats: 1 },
    'meat': { calories: 500, protein: 40, carbs: 0, fats: 35 },
    'eggs': { calories: 150, protein: 13, carbs: 1, fats: 10 },
    'cheese': { calories: 400, protein: 25, carbs: 2, fats: 33 },
    'yogurt': { calories: 150, protein: 8, carbs: 17, fats: 5 },
    'potato': { calories: 300, protein: 6, carbs: 65, fats: 1 },
    'fries': { calories: 500, protein: 6, carbs: 60, fats: 25 },
    'dessert': { calories: 400, protein: 4, carbs: 55, fats: 18 }
  };

  // Căutăm mâncarea în descriere
  let mealName = 'Mâncare';
  let nutritionData = { calories: 350, protein: 15, carbs: 45, fats: 12 }; // valori default

  for (const [food, nutrition] of Object.entries(foodDatabase)) {
    if (lowerDesc.includes(food)) {
      mealName = food.charAt(0).toUpperCase() + food.slice(1);
      nutritionData = nutrition;
      break;
    }
  }

  // Dacă găsim cuvinte cheie despre cantitate, ajustăm
  if (lowerDesc.includes('large') || lowerDesc.includes('big')) {
    nutritionData.calories = Math.round(nutritionData.calories * 1.3);
    nutritionData.protein = Math.round(nutritionData.protein * 1.3);
    nutritionData.carbs = Math.round(nutritionData.carbs * 1.3);
    nutritionData.fats = Math.round(nutritionData.fats * 1.3);
  } else if (lowerDesc.includes('small')) {
    nutritionData.calories = Math.round(nutritionData.calories * 0.7);
    nutritionData.protein = Math.round(nutritionData.protein * 0.7);
    nutritionData.carbs = Math.round(nutritionData.carbs * 0.7);
    nutritionData.fats = Math.round(nutritionData.fats * 0.7);
  }

  return {
    mealName,
    ...nutritionData
  };
}

router.post(
  '/analyze-image',
  upload.single('foodImage'),
  async (req: Request, res: Response): Promise<void> => {
    console.log('📸 Request analyze-image primit');

    if (!req.file) {
      console.error('❌ Niciun fișier primit');
      res.status(400).json({ message: 'Niciun fișier primit.' });
      return;
    }

    console.log('📁 Fișier primit:', {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const filePath = req.file.path;

    try {
      // Citim imaginea
      const imageBuffer = fs.readFileSync(filePath);

      console.log('📤 Trimitere cerere către Hugging Face...');

      // Analizăm imaginea cu Hugging Face
      const hfResponse = await analyzeImageWithHuggingFace(imageBuffer);

      // Extragem descrierea
      const description = Array.isArray(hfResponse) ? hfResponse[0]?.generated_text : hfResponse.generated_text;
      console.log('📝 Descriere primită:', description);

      // Extragem informații nutriționale
      const nutritionInfo = extractNutritionalInfo(description || 'food');

      // Curățăm fișierul
      fs.unlinkSync(filePath);
      console.log('🗑️ Fișier șters:', filePath);

      // Formatăm rezultatul final
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

      console.log('✅ Rezultat final:', result);
      res.json(result);

    } catch (error: any) {
      console.error('❌ Eroare la procesare imagine:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Curățăm fișierul în caz de eroare
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (error.response?.status === 401) {
        res.status(500).json({
          message: 'Eroare de autentificare cu Hugging Face. Verifică API Key.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } else if (error.response?.status === 429) {
        res.status(429).json({
          message: 'Limită de cereri depășită. Încearcă din nou în câteva momente.'
        });
      } else {
        res.status(500).json({
          message: 'Eroare la procesarea imaginii. Te rugăm încearcă din nou.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }
);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: 'Hugging Face',
    apiConfigured: !!HUGGINGFACE_API_KEY,
    model: 'Salesforce/blip-image-captioning-large'
  });
});

export default router;