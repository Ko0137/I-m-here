import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function startServer() {
  const app = express();
  app.use(express.json());

  // Movie Search API
  app.post('/api/search-movie', async (req, res) => {
    try {
      const { query } = req.body;
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Пользователь ищет фильм, сериал или мультфильм: "${query}". 
      Найди 3-5 РАБОЧИХ прямых ссылок на страницы просмотра на популярных ресурсах в СНГ.
      Важно: ссылки должны вести на страницу поиска или самого фильма.
      Верни ТОЛЬКО чистый JSON объект в таком формате (БЕЗ разметки markdown):
      {
        "results": [
          { "title": "Название сайта (например Lordfilm)", "url": "прямая ссылка", "description": "краткое описание, например 'Доступен в 4K'" }
        ]
      }
      Предлагай только известные сайты: hdrezka.ag, lordfilm.lu, kinogo.biz, rezka.ag. Если это YouTube контент, дай ссылку на youtube.com.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Attempt to clean text from markdown blocks if Gemini added them
      const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      
      try {
        const parsed = JSON.parse(cleanedText);
        res.json(parsed);
      } catch (parseError) {
        console.error('Failed to parse text:', cleanedText);
        res.status(500).json({ error: 'Failed to parse Gemini response', raw: cleanedText });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const port = 3000;
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
}

startServer();
