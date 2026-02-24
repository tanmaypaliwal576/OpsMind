import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/Model.js";

const router = express.Router();

/* ============================= */
/* Generate JWT */
/* ============================= */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role, // ✅ IMPORTANT
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

/* ============================= */
/* Signup */
/* ============================= */
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password } = req.body;

    email = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed" });
  }
});

/* ============================= */
/* Login */
/* ============================= */
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;