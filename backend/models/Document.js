import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  filename: String,
  content: String,
  embedding: [Number],
  pageNumber: Number
});

export default mongoose.model("Document", documentSchema);