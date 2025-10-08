import express, { Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import axios from 'axios';
import path from 'path';

const router = express.Router();

// Configurare multer cu limite și validare
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

const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
const CLARIFAI_PAT = process.env.CLARIFAI_PAT; // Personal Access Token

if (!CLARIFAI_API_KEY && !CLARIFAI_PAT) {
  console.error('⚠️ ATENȚIE: CLARIFAI_API_KEY sau CLARIFAI_PAT nu sunt setate în environment variables!');
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
      const imageBytes = fs.readFileSync(filePath);
      const base64Image = imageBytes.toString('base64');

      console.log('🔄 Trimitere cerere către Clarifai...');

      // Folosim GPT-4 Vision model de la Clarifai
      const response = await axios.post(
        'https://api.clarifai.com/v2/models/gpt-4-vision/outputs',
        {
          user_app_id: {
            user_id: 'openai',
            app_id: 'chat-completion'
          },
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image
                },
                text: {
                  raw: `Analizează această imagine de mâncare și returnează DOAR un obiect JSON valid cu următoarele câmpuri:
{
  "mealName": "numele mâncării în română",
  "calories": număr estimat de calorii,
  "protein": grame de proteine,
  "carbs": grame de carbohidrați,
  "fats": grame de grăsimi
}

Asigură-te că răspunsul este DOAR obiectul JSON, fără text suplimentar.`
                }
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `Key ${CLARIFAI_PAT || CLARIFAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Răspuns primit de la Clarifai');

      // Extragem textul din răspuns
      const rawText = response.data?.outputs?.[0]?.data?.text?.raw || '';
      console.log('📝 Text brut primit:', rawText);

      let jsonData: any;

      try {
        // Încercăm să extragem JSON din text
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON parsat cu succes:', jsonData);
        } else {
          throw new Error('Nu s-a găsit JSON în răspuns');
        }
      } catch (parseError) {
        console.warn('⚠️ Eroare la parsarea JSON, folosim valori default');
        // Fallback: încercăm să extragem calorii din text
        const calorieMatch = rawText.match(/(\d+)\s*(?:kcal|calorii)/i);
        const estimatedCalories = calorieMatch ? parseInt(calorieMatch[1]) : 300;

        jsonData = {
          mealName: 'Mâncare neidentificată',
          calories: estimatedCalories,
          protein: Math.round(estimatedCalories * 0.15 / 4), // 15% din calorii
          carbs: Math.round(estimatedCalories * 0.50 / 4),   // 50% din calorii
          fats: Math.round(estimatedCalories * 0.35 / 9)     // 35% din calorii
        };
      }

      // Curățăm fișierul
      fs.unlinkSync(filePath);
      console.log('🗑️ Fișier șters:', filePath);

      const result = {
        mealName: jsonData.mealName || 'Mâncare neidentificată',
        calories: Math.round(jsonData.calories || 300),
        nutrients: {
          protein: Math.round(jsonData.protein || 15),
          carbs: Math.round(jsonData.carbs || 40),
          fats: Math.round(jsonData.fats || 10)
        }
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

      // Returnăm o eroare mai descriptivă
      if (error.response?.status === 401) {
        res.status(500).json({
          message: 'Eroare de autentificare cu Clarifai. Verifică API Key.'
        });
      } else if (error.response?.status === 429) {
        res.status(429).json({
          message: 'Prea multe cereri. Încearcă din nou în câteva momente.'
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

// Health check endpoint pentru AI service
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    clarifaiConfigured: !!(CLARIFAI_API_KEY || CLARIFAI_PAT)
  });
});

export default router;