import express, { Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import { ClarifaiClient } from 'clarifai';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const clarifai = new ClarifaiClient({
  apiKey: process.env.CLARIFAI_API_KEY as string,
});

router.post('/analyze-image', upload.single('foodImage'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Niciun fișier primit.' });

  try {
    const imageBytes = fs.readFileSync(req.file.path);
    const base64Image = imageBytes.toString('base64');

    // Prompt inteligent pentru model
    const prompt = `
      Analizează imaginea următoare. Identifică mâncarea și oferă:
      - Numele felului de mâncare
      - Estimarea caloriilor (kcal)
      - Proteine (g)
      - Carbohidrați (g)
      - Grăsimi (g)
      Returnează răspunsul strict în format JSON.
    `;

    const result = await clarifai.models.predict(
      'general-image-recognition',
      {
        base64: base64Image,
        text: prompt,
      }
    );

    const text = result?.outputs?.[0]?.data?.text?.raw || '';
    let jsonData: any;

    try {
      jsonData = JSON.parse(text);
    } catch {
      jsonData = { mealName: 'Unknown', calories: 200, protein: 0, carbs: 0, fats: 0 };
    }

    fs.unlinkSync(req.file.path);

    res.json({
      mealName: jsonData.mealName || 'Unknown',
      calories: jsonData.calories || 200,
      nutrients: {
        protein: jsonData.protein || 0,
        carbs: jsonData.carbs || 0,
        fats: jsonData.fats || 0,
      },
    });
  } catch (error) {
    console.error('Eroare AI:', error);
    res.status(500).json({ message: 'Eroare la procesare imagine.' });
  }
});

export default router;
