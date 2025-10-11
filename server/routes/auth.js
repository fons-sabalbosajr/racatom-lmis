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
  const { Username, Email, Password, identifier } = req.body || {};

  // Normalize inputs
  const loginId = (Username || Email || identifier || "").trim();

  if (!loginId || !Password) {
    return res
      .status(400)
      .json({ success: false, message: "Username/Email and password are required." });
  }

  // Escape user-provided string for use in a RegExp
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  try {
    // Allow login by Username OR Email (case-insensitive)
    const query = {
      $or: [
        { Username: new RegExp(`^${escapeRegExp(loginId)}$`, "i") },
        { Email: new RegExp(`^${escapeRegExp(loginId)}$`, "i") },
      ],
    };

    const user = await User.findOne(query);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password." });

    let isMatch = false;

    if (user.Password?.startsWith("$2a$") || user.Password?.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(Password, user.Password);
    } else {
      // Plaintext fallback for legacy records
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

    // Optional cookie for legacy flows. Prefer header token used by frontend session storage.
    // Use a more restrictive cookie scope to reduce cross-tab side effects.
    const isProd = process.env.NODE_ENV === "production";
    try {
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProd, // true only for HTTPS production
        sameSite: isProd ? "Strict" : "Lax", // Lax in dev to allow localhost
        maxAge: 24 * 60 * 60 * 1000,
        path: "/", // default scope
      });
    } catch {}

    const { Password: _, verificationToken, ...userData } = user.toObject();

    // Return user data and token; token is also in HTTP-only cookie for backward compatibility
    res.json({
      success: true,
      message: "Login successful.",
      data: { user: userData, token },
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

// ---------- Change Password (authenticated) ----------
router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both old and new password are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Compare old password (handle plaintext legacy and bcrypt)
    let isMatch = false;
    if (user.Password?.startsWith("$2a$") || user.Password?.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(oldPassword, user.Password);
    } else {
      isMatch = oldPassword === user.Password; // legacy
    }

    if (!isMatch) return res.status(401).json({ success: false, message: "Old password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.Password = hashed;
    await user.save();
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
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

// ===== Maintenance status (for UI) =====
// Allows authenticated users to know if maintenance is active and whether they are allowed to bypass it.
// This lives under /api/auth so it's reachable even when the maintenance gate is active.
import runtimeFlags from "../utils/runtimeFlags.js";

router.get("/maintenance-status", requireAuth, async (req, res) => {
  try {
    const role = String(req.user?.Position || "").trim().toLowerCase();
    const hasDbPerm = !!(req.user?.permissions?.menus?.settingsDatabase === true || req.user?.permissions?.menus?.developerSettings === true);
    const allowed = role === "developer" || hasDbPerm;
    return res.json({ success: true, maintenance: !!runtimeFlags.maintenance, allowed });
  } catch (err) {
    console.error("maintenance-status error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Failed to read maintenance status" });
  }
});
