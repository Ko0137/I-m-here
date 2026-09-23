import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/search-movie', async (req, res) => {
  try {
    const { query } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Пользователь ищет фильм или сериал: "${query}". 
    Найди 3-5 популярных сайта, где его можно посмотреть онлайн в хорошем качестве. 
    Верни ответ в формате JSON:
    {
      "results": [
        { "title": "Название сайта", "url": "прямая ссылка на поиск или фильм", "description": "краткое описание" }
      ]
    }
    Важно: предлагай только известные и относительно безопасные ресурсы (hdrezka, kinogo, lordfilm и т.д.).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from markdown if needed
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(500).json({ error: 'Failed to parse Gemini response' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
