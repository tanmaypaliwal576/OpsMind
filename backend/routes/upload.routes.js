import express from "express";
import multer from "multer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import Document from "../models/Document.js";
import { chunkText } from "../utils/ChunkText.js";
import { generateEmbedding } from "../services/embedding.service.js";

const router = express.Router();

/* -------------------- MULTER CONFIG -------------------- */
// Use memory storage to avoid disk read/write delay
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/* -------------------- ROUTE -------------------- */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📄 File received:", req.file.originalname);

    // ⚡ Respond immediately (non-blocking UX)
    res.json({ message: "File uploaded. Processing started." });

    // Process PDF in background
    processPDF(req.file).catch(err =>
      console.error("❌ Background Processing Error:", err)
    );

  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* -------------------- PDF PROCESSOR -------------------- */
async function processPDF(file) {
  try {
    // ✅ Convert Buffer → Uint8Array
    const uint8Array = new Uint8Array(file.buffer);

    const pdf = await getDocument({ data: uint8Array }).promise;

    console.log("📑 Total pages:", pdf.numPages);

    const documentsToInsert = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); //load single page 
      const textContent = await page.getTextContent();  //extract text from page
 
      const strings = textContent.items.map(item => item.str); /**
       * {
  items: [
    { str: "Hello" },
    { str: "world" }
  ]
}
       */
      const pageText = strings.join(" "); //plain text of page

      const chunks = chunkText(pageText);

      const embeddings = await Promise.all(
        chunks.map(chunk => generateEmbedding(chunk))
      );

      chunks.forEach((chunk, index) => {
        documentsToInsert.push({
          filename: file.originalname,
          documentId: file.originalname,
          content: chunk,
          embedding: embeddings[index],
          pageNumber: i
        });
      });
    }

    if (documentsToInsert.length > 0) {
      await Document.insertMany(documentsToInsert);
    } //bulk insert for efficiency

    console.log("✅ PDF fully processed and indexed");

  } catch (error) {
    console.error("❌ PDF Processing Failed:", error);
  }
}

export default router;