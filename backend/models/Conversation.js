import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    confidence: {
      type: Number,
      default: 0,
    },
    sources: [
      {
        filename: {
          type: String,
        },
        page: {
          type: Number,
        },
        similarityScore: {
          type: Number,
        },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);