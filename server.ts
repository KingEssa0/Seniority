import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

// Helper to get or generate VAPID keys for push notifications
function getOrCreateVapidKeys() {
  const keysPath = path.join(process.cwd(), 'vapid-keys.json');
  if (fs.existsSync(keysPath)) {
    try {
      const content = fs.readFileSync(keysPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to read existing VAPID keys, generating new ones:", e);
    }
  }

  // Generate new keys
  const keys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2), 'utf-8');
    console.log("Generated and persisted new VAPID keys to:", keysPath);
  } catch (e) {
    console.error("Failed to save generated VAPID keys to disk:", e);
  }
  return keys;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Set up VAPID details for web-push
  const vapidKeys = getOrCreateVapidKeys();
  webpush.setVapidDetails(
    'mailto:support@senioritysocial.club',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  // Endpoint to fetch VAPID public key for device subscription
  app.get("/api/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // Secure API endpoint to deliver push notification payloads to target devices
  app.post("/api/send-push", async (req, res) => {
    try {
      const { subscriptions, title, body, url } = req.body;
      if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
        return res.json({ status: "skipped", message: "No active subscriptions to notify." });
      }

      const payload = JSON.stringify({
        title: title || "Seniority Club",
        body: body || "You have a new update!",
        url: url || "/"
      });

      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          return { success: true };
        } catch (err: any) {
          // Log issues like expired subscriptions but do not fail the entire batch
          console.warn("Failed sending push to a subscription:", err.message);
          return { success: false, error: err.message };
        }
      });

      const results = await Promise.all(promises);
      res.json({ status: "completed", results });
    } catch (error: any) {
      console.error("Push API error:", error);
      res.status(500).json({ error: error.message || "Failed to deliver push notifications" });
    }
  });

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
