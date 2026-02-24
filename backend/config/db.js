import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1); // terminate app if DB fails
  }
};