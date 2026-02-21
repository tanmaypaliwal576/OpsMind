import express from "express";
import { GoogleGenAI } from "@google/genai";

import Document from "../models/Document.js";
import { generateEmbedding } from "../services/embedding.service.js";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});


// ==============================
// 🔎 LIST AVAILABLE MODELS
// ==============================
router.get("/models", async (req, res) => {
  try {
    const models = await ai.models.list();
    res.json(models);
  } catch (error) {
    console.error("Model List Error:", error);
    res.status(500).json({ error: "Failed to list models" });
  }
});


// ==============================
// 💬 CHAT (ENTERPRISE RAG)
// ==============================
router.post("/", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log("🟢 Question received:", question);

    // 1️⃣ Convert question → embedding
    const queryEmbedding = await generateEmbedding(question);
    // 2️⃣ Vector search in MongoDB Atlas
    const results = await Document.aggregate([
      {
        $vectorSearch: {
          index: "vector_index", // MUST match Atlas index name
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: 8
        }
      },
      {
        $project: {
          content: 1,
          filename: 1,
          pageNumber: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);

    if (!results.length) {
      return res.json({
        answer: "I don't know.",
        sources: []
      });
    }

    // 3️⃣ Build context with page references
    const context = results
      .map(
        r =>
          `[Source: ${r.filename}, Page: ${r.pageNumber ?? "N/A"}]\n${r.content}`
      )
      .join("\n\n");

    // 4️⃣ Strong enterprise prompt
  const prompt = `
You are a database lab assistant helping students understand SQL experiments.

Follow these rules strictly:

1. Use ONLY the information provided in the context.
2. If the question asks for explanation, provide a clear explanation from the context.
3. If the question asks to write an SQL query, generate the correct SQL query using the table and column names found in the context.
4. If logical computation is required (e.g., increasing fare by 10%), apply SQL logic to generate the correct expression.
5. If the answer cannot be derived from the context, respond exactly with:
"I don't know."
6. Also Dont add /n in the answer 
Do not invent table names or columns.
Do not assume information that is not present.

Context:
${context}

Question:
${question}
`;
    // 5️⃣ Generate grounded answer
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    const answer =
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I don't know.";

    // 6️⃣ Remove duplicate sources
    const uniqueSources = [
      ...new Map(
        results.map(r => [
          `${r.filename}-${r.pageNumber}`,
          {
            filename: r.filename,
            page: r.pageNumber,
            similarityScore: r.score
          }
        ])
      ).values()
    ];

    // 7️⃣ Return final structured response
    res.json({
      answer,
      sources: uniqueSources
    });

  } catch (error) {
    console.error("❌ Chat Error:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;