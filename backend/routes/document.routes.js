import express from "express";
import Document from "../models/Document.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const docs = await Document.distinct("documentId");
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

export default router;