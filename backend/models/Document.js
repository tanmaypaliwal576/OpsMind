import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  documentId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  pageNumber: {
    type: Number,
    required: true
  }
});

export default mongoose.model("Document", documentSchema);