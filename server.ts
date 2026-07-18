import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini client initialization on the server using process.env.GEMINI_API_KEY
  // with correct user-agent telemetry header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Secure API route for elegant, hallucination-free translation
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Missing text or targetLanguage" });
      }

      const prompt = `You are a professional, warm, and extremely caring translator for elderly people in a Senior Social Club application called Seniority.
Translate the following user-shared post/text precisely, naturally, and warmly into the language specified below.

Requirements:
- DO NOT hallucinate any facts.
- DO NOT add any translator's notes, commentary, introductory text (such as "Here is the translation:"), or extra words.
- Maintain the exact tone, formatting, and emotion (keep emojis exactly as they are in the original).
- Ensure the translation is comforting, accurate, and completely natural for a senior citizen to read.

Target Language: ${targetLanguage}
Text to Translate:
"${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const translatedText = response.text || "";
      res.json({ translatedText: translatedText.trim() });
    } catch (error: any) {
      console.error("Translation API error:", error);
      res.status(500).json({ error: error.message || "Failed to translate text" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
