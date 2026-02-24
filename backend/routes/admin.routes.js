import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import User from "../models/Model.js";
import Document from "../models/Document.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ===================================================== */
/* 📊 SYSTEM-WIDE ANALYTICS */
/* ===================================================== */
router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    const totalConversations = await Conversation.countDocuments();

    const totalDocuments = await Document.distinct("filename");

    const avgConfidenceResult = await Conversation.aggregate([
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: "$confidence" },
        },
      },
    ]);

    const avgConfidence =
      avgConfidenceResult.length > 0
        ? avgConfidenceResult[0].avgConfidence
        : 0;

    /* ===== Most Queried Documents ===== */
    const mostQueriedDocuments = await Conversation.aggregate([
      { $unwind: "$sources" },
      {
        $group: {
          _id: "$sources.filename",
          totalQueries: { $sum: 1 },
        },
      },
      { $sort: { totalQueries: -1 } },
      { $limit: 10 },
    ]);

    /* ===== Low Confidence Queries ===== */
    const lowConfidenceQueries = await Conversation.find({
      confidence: { $lt: 0.72 },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("question confidence user createdAt");

    /* ===== Recent Queries (Confidence Trend) ===== */
    const recentQueries = await Conversation.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("confidence createdAt");

    /* ===== Users With Conversation Count ===== */
    const users = await User.aggregate([
      {
        $lookup: {
          from: "conversations",
          localField: "_id",
          foreignField: "user",
          as: "userConversations",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          conversationCount: { $size: "$userConversations" },
        },
      },
      { $sort: { conversationCount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalConversations,
        totalDocuments: totalDocuments.length,
        avgConfidence,
        mostQueriedDocuments,
        lowConfidenceQueries,
        recentQueries,
        users,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Analytics failed" });
  }
});

/* ===================================================== */
/* 👤 USER CONVERSATIONS */
/* ===================================================== */
router.get("/user/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid ID" });

    const conversations = await Conversation.find({ user: id })
      .sort({ createdAt: -1 })
      .select("question answer confidence createdAt");

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

export default router;