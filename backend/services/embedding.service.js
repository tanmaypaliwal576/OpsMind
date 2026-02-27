import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export const generateEmbedding = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      return null;
    }

    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [
        {
          role: "user",
          parts: [{ text }]
        }
      ]
    });

    return response.embeddings[0].values;

  } catch (error) {
    console.error("❌ Embedding Error:", error.message);
    throw error;
  }
};