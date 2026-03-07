import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {connectDB} from "./config/db.js";

import uploadRoutes from "./routes/upload.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authroutes from "./routes/auth.routes.js";

dotenv.config();
connectDB();


const app = express();

app.use(cors({
  origin: "*",
  credentials: true
}))
app.use(express.json());

app.get("/", (req, res) => {
  res.send("OpsMind API running");
});

app.use("/api/auth", authroutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT;


app.listen(PORT, () => console.log(`Server running on ${PORT}`));