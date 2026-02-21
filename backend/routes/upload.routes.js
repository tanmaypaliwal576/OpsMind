import express from "express";
import multer from "multer";
import fs from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import Document from "../models/Document.js";
import { chunkText } from "../utils/ChunkText.js";
import { generateEmbedding } from "../services/embedding.service.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📄 File received:", req.file.originalname);

    const data = new Uint8Array(fs.readFileSync(req.file.path));
    const pdf = await getDocument({ data }).promise;

    console.log("📑 Total pages:", pdf.numPages);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map(item => item.str);
      const pageText = strings.join(" ");

      // Chunk page-wise
      const chunks = chunkText(pageText);

      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);

        await Document.create({
          filename: req.file.originalname,
          content: chunk,
          embedding,
          pageNumber: i  // ✅ Correct page number
        });
      }
    }

    fs.unlinkSync(req.file.path);

    console.log("✅ PDF fully processed and indexed");

    res.json({ message: "PDF processed successfully" });

  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: "PDF processing failed" });
  }
});

export default router;