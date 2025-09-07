// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/UserAccount.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "../utils/email.js";

const router = express.Router();




// ---------- Register ----------
router.post("/register", async (req, res) => {
  try {
    const { FullName, Email, Username, Password, Designation, Position } =
      req.body;

    const existingUser = await User.findOne({ $or: [{ Username }, { Email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username or Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // --- designation code mapping ---
    const designationCodes = {
      Administrator: "AD",
      Staff: "ST",
      Developer: "DV",
      Manager: "MG",
      User: "US",
    };
    const desigCode = designationCodes[Designation] || "XX";

    // --- find last SystemID and increment ---
    const lastUser = await User.findOne().sort({ _id: -1 }).select("SystemID");
    let nextNumber = 1001; // default start

    if (lastUser?.SystemID) {
      const match = lastUser.SystemID.match(/RCT-U(\d+)-/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const paddedNum = String(nextNumber).padStart(4, "0");
    const systemID = `RCT-U${paddedNum}-${desigCode}`;

    const newUser = new User({
      SystemID: systemID,
      FullName,
      Email,
      Username,
      Password: hashedPassword,
      Designation,
      Position,
      isVerified: false,
      verificationToken,
    });

    await newUser.save();
    await sendVerificationEmail(Email, newUser);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: { SystemID: systemID },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Verify Email ----------
// routes/auth.js
router.get("/verify-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        code: "NO_TOKEN",
        message: "Invalid verification link.",
      });
    }

    // Find user with this token
    let user = await User.findOne({ verificationToken: token });

    if (user) {
      // First-time verification
      user.isVerified = true;
      user.verificationToken = undefined; // remove token after use
      await user.save();

      return res.json({
        success: true,
        code: "VERIFIED",
        message: "Your email has been verified. You may now log in.",
      });
    }

    // Check if already verified (but token cleared)
    user = await User.findOne({
      isVerified: true,
      verificationToken: { $exists: false },
    });

    if (user) {
      return res.status(200).json({
        success: true,
        code: "ALREADY_VERIFIED",
        //message: "Your email is already verified. Please log in.",
      });
    }

    // Otherwise: invalid / expired
    return res.status(400).json({
      success: false,
      code: "INVALID_OR_EXPIRED",
      message: "Invalid or expired verification link.",
    });
  } catch (err) {
    console.error("Verification error:", err.message);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Server error during verification.",
    });
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

    // --- FIX: cookie settings for dev ---
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd, // true only for HTTPS production
      sameSite: isProd ? "Strict" : "lax", // 'lax' for dev on HTTP
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { Password: _, verificationToken, ...userData } = user.toObject();

    // Return user data; token is in HTTP-only cookie
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

router.post("/forgot-password", async (req, res) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ Email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email" });
    }

    // Generate raw + hashed token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Save hashed token in DB
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour expiry
    await user.save();

    // Send reset email with RAW token
    await sendResetPasswordEmail(Email, rawToken);

    // 🔍 Debug logs
    // console.log("🔑 Password reset token generated:");
    // console.log("   Raw (emailed):   ", rawToken);
    // console.log("   Hashed (stored): ", hashedToken);

    return res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { Password } = req.body;

    if (!Password) {
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }

    // Hash the raw token from URL before lookup
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Debug log
    // console.log("🔍 Incoming reset request:");
    // console.log("   Raw token:    ", token);
    // console.log("   Hashed token: ", hashedToken);

    // Find user with matching hashed token + valid expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // still valid
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(Password, 10);
    user.Password = hashedPassword;

    // Clear reset token after use
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful. You may now log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error during password reset.",
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
