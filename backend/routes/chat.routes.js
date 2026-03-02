import express from "express";
import { GoogleGenAI } from "@google/genai";
import Document from "../models/Document.js";
import Conversation from "../models/Conversation.js";
import { generateEmbedding } from "../services/embedding.service.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

/* ========================================================= */
/* 🧠 HELPER: REWRITE QUESTION INTO STANDALONE FORM */
/* ========================================================= */
async function rewriteQuestion(userId, question) {
  const history = await Conversation.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  if (!history.length) return question;

  const formattedHistory = history
    .reverse()
    .map(h => `User: ${h.question}\nAssistant: ${h.answer}`)
    .join("\n\n");

  const rewritePrompt = `
Given the following conversation:

${formattedHistory}

Rewrite the latest question into a fully self-contained standalone question.
If it is already standalone, return it unchanged.

Latest question:
${question}

Standalone question:
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: rewritePrompt }] }]
    });

    const rewritten =
      response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return rewritten || question;
  } catch (err) {
    console.error("Rewrite failed:", err);
    return question;
  }
}

/* ========================================================= */
/* 💬 NON-STREAM CHAT */
/* ========================================================= */
router.post("/", protect, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question required" });
    }

    /* 🧠 STEP 1: Rewrite Question */
    const standaloneQuestion = await rewriteQuestion(req.user.id, question);

    /* ================= EMBEDDING ================= */
    const queryEmbedding = await generateEmbedding(standaloneQuestion);
    if (!queryEmbedding) {
      return res.json({ answer: "I don't know.", sources: [] });
    }

    /* ================= VECTOR SEARCH ================= */
    const results = await Document.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
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

    if (!results.length || results[0].score < 0.72) {
      return res.json({ answer: "I don't know.", sources: [] });
    }

    /* ================= UNIQUE SOURCES ================= */
    const sourceMap = new Map();

    results.forEach(r => {
      const key = `${r.filename}-${r.pageNumber}`;
      if (!sourceMap.has(key) || r.score > sourceMap.get(key).similarityScore) {
        sourceMap.set(key, {
          filename: r.filename,
          page: r.pageNumber,
          similarityScore: r.score
        });
      }
    });

    const uniqueSources = [...sourceMap.values()]
      .sort((a, b) => b.similarityScore - a.similarityScore);

    /* ================= BUILD CONTEXT ================= */
    const context = results
      .map(r =>
`Filename: ${r.filename}
Page: ${r.pageNumber}
Content:
${r.content}`
      )
      .join("\n\n----------------\n\n");

    const prompt = `
You are an enterprise academic assistant.

STRICT RULES:
1. Use ONLY the provided context.
2. Every factual statement MUST end with citation:
   (Source: <filename>, Page <pageNumber>)
3. If answer not clearly found, respond exactly:
   "I don't know."
4. Do NOT invent citations.

Context:
${context}

Question:
${question}
`;

    /* ================= GENERATE ANSWER ================= */
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const answer =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I don't know.";

    /* ================= SAVE ================= */
    await Conversation.create({
      question,
      answer,
      confidence: results[0].score,
      sources: uniqueSources,
      user: req.user.id
    });

    return res.json({ answer, sources: uniqueSources });

  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Chat failed" });
  }
});

/* ========================================================= */
/* 💬 STREAMING CHAT */
/* ========================================================= */
router.post("/stream", protect, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    /* 🧠 STEP 1: Rewrite */
    const standaloneQuestion = await rewriteQuestion(req.user.id, question);

    /* ================= EMBEDDING ================= */
    const queryEmbedding = await generateEmbedding(standaloneQuestion);

    if (!queryEmbedding) {
      res.write(`data: ${JSON.stringify({ chunk: "I don't know." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, sources: [] })}\n\n`);
      return res.end();
    }

    /* ================= VECTOR SEARCH ================= */
    const results = await Document.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
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

    if (!results.length || results[0].score < 0.72) {
      res.write(`data: ${JSON.stringify({ chunk: "I don't know." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, sources: [] })}\n\n`);
      return res.end();
    }

    const sourceMap = new Map();
    results.forEach(r => {
      const key = `${r.filename}-${r.pageNumber}`;
      if (!sourceMap.has(key) || r.score > sourceMap.get(key).similarityScore) {
        sourceMap.set(key, {
          filename: r.filename,
          page: r.pageNumber,
          similarityScore: r.score
        });
      }
    });

    const uniqueSources = [...sourceMap.values()];

    const context = results
      .map(r =>
`Filename: ${r.filename}
Page: ${r.pageNumber}
Content:
${r.content}`
      )
      .join("\n\n----------------\n\n");

    const prompt = `
You are an enterprise academic assistant.
Use ONLY the provided context.
Cite every statement.
If not found, say "I don't know."

Context:
${context}

Question:
${question}
`;

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    let fullAnswer = "";

    for await (const chunk of stream) {
      const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        fullAnswer += text;
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }
    }

    await Conversation.create({
      question,
      answer: fullAnswer,
      confidence: results[0].score,
      sources: uniqueSources,
      user: req.user.id
    });

    res.write(`data: ${JSON.stringify({ done: true, sources: uniqueSources })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Streaming Error:", error);
    res.end();
  }
});

export default router;