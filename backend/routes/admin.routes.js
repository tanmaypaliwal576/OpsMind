import express from "express";
import Conversation from "../models/Conversation.js";
import Document from "../models/Document.js";

const router = express.Router();


// ==============================
// 📊 ADMIN ANALYTICS DASHBOARD
// ==============================
router.get("/analytics", async (req, res) => {
  try {

    // 1️⃣ Total Conversations
    const totalConversations = await Conversation.countDocuments();

    // 2️⃣ Most Queried Documents
    const mostQueriedDocs = await Conversation.aggregate([
      {
        $group: {
          _id: "$documentId",
          totalQueries: { $sum: 1 }
        }
      },
      { $sort: { totalQueries: -1 } }
    ]);

    // 3️⃣ Recent Queries
    const recentQueries = await Conversation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("documentId question createdAt");

    // 4️⃣ Total Documents Uploaded
    const totalDocuments = await Document.distinct("documentId");

    res.json({
      totalConversations,
      totalDocuments: totalDocuments.length,
      mostQueriedDocuments: mostQueriedDocs,
      recentQueries
    });

  } catch (error) {
    console.error("Admin Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;