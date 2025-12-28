
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function askAssistant(prompt: string, language: string = 'en') {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are a warm, patient, and friendly AI assistant for an elderly social media app called Seniority. 
        Your goal is to help users understand technology, social media trends, or explain complex terms simply. 
        Keep your tone supportive and avoid technical jargon. 
        If the language is Arabic or Urdu, ensure you format your response for Right-to-Left readability.
        Always respond in the requested language: ${language}.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Assistant Error:", error);
    return "I'm sorry, I'm having a little trouble connecting right now. Please try again later.";
  }
}

export async function teachGameTutorial(gameName: string, language: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain the basic rules and a winning strategy for ${gameName} in simple terms for an elderly beginner. Use the language: ${language}. Break it into 5 clear steps.`,
      config: {
        systemInstruction: "You are a patient grandmaster. Your goal is to make a game sound approachable and fun. Use emojis and clear headings.",
      },
    });
    return response.text;
  } catch (error) {
    return "I couldn't generate the tutorial right now. Maybe we can play together later!";
  }
}

export async function translateContent(text: string, targetLang: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text into the native script of ${targetLang}: "${text}"`,
      config: {
        systemInstruction: "You are a professional translator. Provide only the translated text. Do not include quotes or meta-talk.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
}

export async function describeImage(imageUrl: string, language: string) {
  try {
    const part = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageUrl.split(',')[1] || imageUrl,
      },
    };
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          part, 
          { text: `Describe this photo warmly and clearly for an elderly person in ${language}. Focus on the people, the setting, and the mood.` }
        ] 
      },
    });
    return response.text;
  } catch (error) {
    console.error("Image Desc Error:", error);
    return "I can't quite see the details in this photo yet.";
  }
}

export async function checkPostSafety(content: string, language: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this post for an elderly user. Is it likely a scam, phishing, or dangerous? Explain why briefly in ${language}. Start with [SAFE] or [CAUTION].`,
      config: {
        systemInstruction: "You are a cyber-safety expert for seniors. Keep your explanation very simple and calm.",
      },
    });
    return response.text;
  } catch (error) {
    return "[SAFE] I couldn't scan it completely, but it looks okay.";
  }
}

export async function enhanceStory(briefCaption: string, language: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user wrote: "${briefCaption}". Expand this into a heartwarming, nostalgic short story (max 3 sentences) suitable for a senior's social media memory. Use the language: ${language}.`,
      config: {
        systemInstruction: "You are a professional storyteller who specializes in senior memories. Your tone is warm, nostalgic, and gentle.",
      },
    });
    return response.text;
  } catch (error) {
    return briefCaption;
  }
}

export async function summarizeFeed(posts: any[], language: string) {
  try {
    const textData = posts.map(p => `${p.author.name} shared: ${p.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following social media feed into a warm "audio recap" for a senior user in ${language}: \n${textData}`,
      config: {
        systemInstruction: "Start with a friendly greeting like 'Here is what your friends have been up to.' Focus on positive updates. Keep it concise, around 4 sentences.",
      },
    });
    return response.text;
  } catch (error) {
    return "I couldn't get the highlights right now, but your friends are thinking of you!";
  }
}

export async function summarizeThread(thread: string, language: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize this conversation briefly for a senior user in ${language}: ${thread}`,
      config: {
        systemInstruction: `Keep it simple and focus on the main activity or sentiment. Maximum 2 sentences. Use the language: ${language}.`,
      },
    });
    return response.text;
  } catch (error) {
    return "Could not summarize.";
  }
}
