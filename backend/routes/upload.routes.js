import express from "express";
import multer from "multer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { v4 as uuidv4 } from "uuid";

import Document from "../models/Document.js";
import { chunkText } from "../utils/ChunkText.js";
import { generateEmbedding } from "../services/embedding.service.js";

const router = express.Router();

export let documentsReady = false;
let indexingInProgress = false;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/status", async (req, res) => {

  try {

    const count = await Document.countDocuments();

    res.json({
      indexing: indexingInProgress,
      documentsReady,
      totalDocuments: count
    });

  } catch (error) {

    res.status(500).json({
      indexing: indexingInProgress,
      documentsReady
    });

  }

});

router.post("/", upload.single("file"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    documentsReady = false;
    indexingInProgress = true;

    res.json({
      message: "File uploaded. Processing started."
    });

    const documentId = uuidv4();

    const uint8Array = new Uint8Array(req.file.buffer);
    const pdf = await getDocument({ data: uint8Array }).promise;

    const documentsToInsert = [];
    const seenChunks = new Set();

    for (let i = 1; i <= pdf.numPages; i++) {

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const strings = textContent.items.map(item => item.str);
      const pageText = strings.join(" ");

      const chunks = chunkText(pageText, 800, 150);

      for (const chunk of chunks) {

        const normalized = chunk.trim();

        if (seenChunks.has(normalized)) continue;
        seenChunks.add(normalized);

        const embedding = await generateEmbedding(normalized);

        if (!embedding) continue;

        documentsToInsert.push({
          filename: req.file.originalname,
          documentId,
          content: normalized,
          embedding,
          pageNumber: i
        });

      }

    }

    if (documentsToInsert.length > 0) {
      await Document.insertMany(documentsToInsert);
    }

    documentsReady = true;
    indexingInProgress = false;

  } catch (error) {

    indexingInProgress = false;
    console.error(error);

  }

});

export default router;