import express from "express";
import { GoogleGenAI } from "@google/genai";
import Document from "../models/Document.js";
import Conversation from "../models/Conversation.js";
import { generateEmbedding } from "../services/embedding.service.js";
import { protect } from "../middlewares/auth.middleware.js";
import { documentsReady } from "./upload.routes.js";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

/* ============================= */
/* ESCAPE REGEX */
/* ============================= */

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ============================= */
/* HELPER: REWRITE QUESTION */
/* ============================= */

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
Rewrite the question into a clear standalone search query.

Ensure experiment numbers, keywords, and document references remain explicit.

Conversation:
${formattedHistory}

Question:
${question}
`;

  try {

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: rewritePrompt }] }]
    });

    const rewritten =
      response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return rewritten || question;

  } catch {

    return question;

  }

}

/* ============================= */
/* HYBRID SEARCH */
/* ============================= */

async function hybridSearch(queryEmbedding, question) {

  /* VECTOR SEARCH */

  const vectorResults = await Document.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 800,
        limit: 40
      }
    },
    {
      $project: {
        content: 1,
        filename: 1,
        documentId: 1,
        pageNumber: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ]);

  /* KEYWORD SEARCH (SAFE REGEX) */

  const safeQuery = escapeRegex(question);

  const keywordResults = await Document.aggregate([
    {
      $match: {
        content: { $regex: safeQuery, $options: "i" }
      }
    },
    { $limit: 20 }
  ]);

  /* MERGE RESULTS */

  const combined = [...vectorResults];

  keywordResults.forEach(k => {

    combined.push({
      ...k,
      score: 0.5
    });

  });

  return combined;
}

/* ============================= */
/* BALANCE RESULTS ACROSS DOCS */
/* ============================= */

function balanceDocuments(results) {

  const perDocLimit = 4;
  const grouped = {};

  for (const r of results) {

    if (!grouped[r.documentId]) {
      grouped[r.documentId] = [];
    }

    if (grouped[r.documentId].length < perDocLimit) {
      grouped[r.documentId].push(r);
    }

  }

  return Object.values(grouped)
    .flat()
    .slice(0, 12);

}

/* ============================= */
/* STREAM CHAT */
/* ============================= */

router.post("/stream", protect, async (req, res) => {

  try {

    if (!documentsReady) {

      res.write(`data: ${JSON.stringify({
        chunk: "Document is still processing. Please wait..."
      })}\n\n`);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);

      return res.end();
    }

    const { question } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const standaloneQuestion = await rewriteQuestion(req.user.id, question);

    const queryEmbedding = await generateEmbedding(standaloneQuestion);

    /* ============================= */
    /* HYBRID RETRIEVAL */
    /* ============================= */

    const retrieved = await hybridSearch(queryEmbedding, standaloneQuestion);

    if (!retrieved.length) {

      res.write(`data: ${JSON.stringify({
        chunk: "No relevant information found."
      })}\n\n`);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);

      return res.end();
    }

    /* ============================= */
    /* BALANCE MULTIPLE DOCUMENTS */
    /* ============================= */

    const balancedResults = balanceDocuments(retrieved);

    /* ============================= */
    /* SOURCE EXTRACTION */
    /* ============================= */

    const sourceMap = new Map();

    balancedResults.forEach(r => {

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
      .sort((a,b)=> b.similarityScore - a.similarityScore);

    /* ============================= */
    /* CONTEXT BUILDING */
    /* ============================= */

    const context = balancedResults.map(r =>

`Document: ${r.filename}
Page: ${r.pageNumber}

${r.content}`

    ).join("\n\n----------------\n\n");

    const prompt = `
You are an academic research assistant.

Answer using ONLY the provided context.

Rules:
- Combine information from multiple documents
- Cite sources like (DocumentName Page X)
- If the answer is missing say "Not found in documents"

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

    /* ============================= */
    /* SAVE CONVERSATION */
    /* ============================= */

    await Conversation.create({
      question,
      answer: fullAnswer,
      confidence: uniqueSources[0]?.similarityScore || 0,
      sources: uniqueSources,
      user: req.user.id
    });

    /* ============================= */
    /* SEND SOURCES TO FRONTEND */
    /* ============================= */

    res.write(`data: ${JSON.stringify({
      sources: uniqueSources
    })}\n\n`);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);

    res.end();

  } catch (error) {

    console.error("Streaming error:", error);
    res.end();

  }

});

export default router;