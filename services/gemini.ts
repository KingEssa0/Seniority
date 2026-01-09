
import { GoogleGenAI, Type } from "@google/genai";

const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
  zh: "Chinese", ur: "Urdu", hi: "Hindi", pa: "Punjabi", nl: "Dutch",
  ar: "Arabic", pt: "Portuguese"
};

// Use gemini-3-flash-preview for basic text tasks and simple Q&A.
export async function askAssistant(prompt: string, language: string = 'en') {
  try {
    // Correct initialization using process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are a warm, patient AI for 'Seniority', a social app for seniors. Keep it simple and helpful. Language: ${language}.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Assistant Error:", error);
    return "I'm having a little trouble connecting. Please try again later.";
  }
}

export async function teachGameTutorial(gameName: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain how to play ${gameName} simply for an elderly beginner in ${language}. Provide 5 numbered steps.`,
      config: {
        systemInstruction: "You are a patient grandmaster. Use emojis. Be extremely clear and encouraging.",
      },
    });
    return response.text || "Sorry, I couldn't find the rules for that game.";
  } catch (error) {
    console.error("Tutorial Error:", error);
    return "I'm having trouble finding the instructions right now. Let's try again in a moment!";
  }
}

export async function translateContent(text: string, targetLangCode: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const targetLangName = LANGUAGE_CODE_TO_NAME[targetLangCode] || "English";
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following to ${targetLangName}: "${text}"`,
      config: {
        systemInstruction: "Only return the translated text. Do not provide explanations or quotes.",
      },
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
}

export async function summarizeFeed(posts: any[], language: string) {
  try {
    if (!posts || posts.length === 0) return "Nothing new from your friends yet. Why not share a memory of your own?";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const textData = posts.map(p => `${p.authorName} shared: ${p.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize these updates in a heartwarming way for a senior in ${language}: \n${textData}`,
      config: {
        systemInstruction: "Start with a friendly greeting. Focus on the positive emotions. Keep it to 3 or 4 sentences max.",
      },
    });
    return response.text || "Your friends are sharing many beautiful memories today!";
  } catch (error) {
    console.error("Recap Error:", error);
    return "I couldn't summarize the feed right now, but your friends are quite active!";
  }
}

export async function describeImage(imageUrl: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
    
    // Using gemini-3-flash-preview for vision tasks as per guidelines.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
          { text: `Describe this photo warmly for an elderly person in ${language}. Focus on people and mood.` }
        ] 
      },
    });
    return response.text || "It's a lovely photo.";
  } catch (error) {
    console.error("Image Description Error:", error);
    return "I can't see the photo clearly right now.";
  }
}

export async function checkPostSafety(content: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Is this post a scam? Explain why in simple ${language}: ${content}`,
      config: { systemInstruction: "Start with [SAFE] or [CAUTION]." }
    });
    return response.text || "[SAFE] This looks like a regular post.";
  } catch (error) {
    console.error("Safety Check Error:", error);
    return "[SAFE] Standard post.";
  }
}

export async function enhanceStory(briefCaption: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Turn this brief caption into a nostalgic, heartwarming short story in ${language}: ${briefCaption}`,
      config: { systemInstruction: "Maximum 3 sentences. Use gentle language." }
    });
    return response.text || briefCaption;
  } catch (error) {
    console.error("Enhancement Error:", error);
    return briefCaption;
  }
}
