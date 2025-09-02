// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/UserAccount.js";
import requireAuth from "../middleware/requireAuth.js";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

// ---------- Register ----------
router.post("/register", async (req, res) => {
  try {
    const { FullName, Email, Username, Password } = req.body;

    const existingUser = await User.findOne({ $or: [{ Username }, { Email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username or Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      FullName,
      Email,
      Username,
      Password: hashedPassword,
      isVerified: false,
      verificationToken,
    });

    await newUser.save();
    await sendVerificationEmail(Email, newUser);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Verify Email ----------
router.get("/verify-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res
        .status(404)
        .json({ status: "failed", message: "Invalid or expired token." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ status: "success", message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify token error:", err.message);
    res.status(500).json({ status: "error", message: "Server error." });
  }
});

// ---------- Login ----------
router.post("/login", async (req, res) => {
  const { Username, Password } = req.body;

  try {
    const user = await User.findOne({ Username });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password." });

    let isMatch = false;

    if (user.Password.startsWith("$2a$") || user.Password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(Password, user.Password);
    } else {
      // Plaintext fallback
      isMatch = Password === user.Password;
      if (isMatch) {
        user.Password = await bcrypt.hash(Password, 10);
        await user.save();
      }
    }

    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password." });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ success: false, message: "Account not verified." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Detect environment
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // must be false for HTTP dev
      sameSite: "None", // allow cross-origin
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { Password: _, verificationToken, ...userData } = user.toObject();

    // Return only user info, token is in cookie
    res.json({
      success: true,
      message: "Login successful.",
      data: { user: userData },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Logout ----------
router.post("/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "Strict" : "None",
  });
  res.json({ success: true, message: "Logged out successfully." });
});

// ---------- Resend Verification ----------
router.post("/resend-verification", async (req, res) => {
  const { email, username } = req.body;
  if (!email && !username)
    return res.status(400).json({ error: "Email or username is required." });

  try {
    const query = email ? { Email: email } : { Username: username };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isVerified)
      return res.status(400).json({ error: "Email already verified." });

    await sendVerificationEmail(user.Email, user, true);
    res
      .status(200)
      .json({ message: "Verification email resent successfully." });
  } catch (err) {
    console.error("Resend verification failed:", err.message);
    res.status(500).json({
      error: "Failed to send verification email. Please try again later.",
      details: err.message,
    });
  }
});

// ---------- Protected Route ----------
router.get("/me", requireAuth, async (req, res) => {
  try {
    //console.log("req.user:", req.user); // should show { id: ... }
    const user = await User.findById(req.user.id).select(
      "-Password -verificationToken"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Wrap in `data.user` for frontend consistency
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error("Me error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

export default router;
