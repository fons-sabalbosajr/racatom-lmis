// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/UserAccount.js";
import requireAuth from "../middleware/requireAuth.js";
import runtimeFlags from "../utils/runtimeFlags.js";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendVerificationCode,
  sendCredentialChangeNotification,
} from "../utils/email.js";

const router = express.Router();

// ---------- Password Complexity Validation ----------
// Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
function validatePasswordComplexity(password) {
  if (!password || typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Password must contain at least one special character";
  return null; // valid
}

// Designations that self-registering users are NOT allowed to choose
const RESTRICTED_DESIGNATIONS = ["Administrator", "Developer"];

// Helpers to sign tokens
function signAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "8h" });
}
function signRefreshToken(userId) {
  const secret = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
}
function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  try {
    res.cookie("rt", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "Strict" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  } catch {}
}

// ---------- Register (request-only, no username/password) ----------
router.post("/register", async (req, res) => {
  try {
    const { FullName, Email, Designation } = req.body;

    // Validate required fields
    if (!FullName || !Email || !Designation) {
      return res.status(400).json({ success: false, message: "Full name, email, and designation are required." });
    }

    // Block privilege escalation: prevent self-registration as Administrator/Developer
    if (RESTRICTED_DESIGNATIONS.includes(Designation)) {
      return res.status(403).json({
        success: false,
        message: "This designation is not available for self-registration. Contact an administrator.",
      });
    }

    const existingUser = await User.findOne({ Email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "An account request with this email already exists." });
    }

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
      Designation,
      isVerified: false,
      accountStatus: "pending",
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Account request submitted. A developer will review and set up your credentials.",
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
    // Since the token was cleared after first verification, we can't match by token.
    // Return a generic message so the user knows the link was already used.
    return res.status(400).json({
      success: false,
      code: "INVALID_OR_EXPIRED",
      message: "This verification link is invalid or has already been used. If you already verified, please log in.",
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
    // Allow login by Username, Email, or SystemID (case-insensitive)
    const query = {
      $or: [
        { Username: new RegExp(`^${escapeRegExp(loginId)}$`, "i") },
        { Email: new RegExp(`^${escapeRegExp(loginId)}$`, "i") },
        { SystemID: new RegExp(`^${escapeRegExp(loginId)}$`, "i") },
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

    // Check account status
    if (user.accountStatus === "pending")
      return res
        .status(403)
        .json({ success: false, message: "Your account is still pending approval." });

    if (!user.isVerified && user.accountStatus !== "approved")
      return res
        .status(403)
        .json({ success: false, message: "Account not verified." });

    const token = signAccessToken(user._id);

    // Issue refresh token cookie (HttpOnly) for seamless re-auth without storing tokens in web storage
    setRefreshCookie(res, signRefreshToken(user._id));

    // Optional cookie for legacy flows. Prefer header token used by frontend session storage.
    // Use a more restrictive cookie scope to reduce cross-tab side effects.
    const isProd = process.env.NODE_ENV === "production";
    try {
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProd, // true only for HTTPS production
        sameSite: isProd ? "Strict" : "Lax", // Lax in dev to allow localhost
        maxAge: 15 * 60 * 1000, // match JWT 15min expiry
        path: "/", // default scope
      });
    } catch {}

    const { Password: _, verificationToken, verificationCode, verificationCodeExpires, ...userData } = user.toObject();

    // Return user data and token; include mustChangePassword flag for first-time login redirect
    res.json({
      success: true,
      message: "Login successful.",
      data: { user: userData, token, mustChangePassword: !!user.mustChangePassword },
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
  // also clear refresh cookie
  try {
    res.clearCookie("rt", { httpOnly: true, secure: isProd, sameSite: isProd ? "Strict" : "Lax" });
  } catch {}
  res.json({ success: true, message: "Logged out successfully." });
});

// ---------- Refresh Access Token (uses HttpOnly refresh cookie) ----------
router.get("/refresh", async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    if (!rt) return res.status(401).json({ success: false, message: "No refresh token" });
    const secret = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(rt, secret);
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }
    const user = await User.findById(decoded.id).select("-Password -verificationToken -resetPasswordToken -resetPasswordExpires");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    // Issue a new access token (short-lived)
    const token = signAccessToken(user._id);
    // Optionally rotate refresh token for better security
    setRefreshCookie(res, signRefreshToken(user._id));
    // Lightweight presence update
    try { User.updateOne({ _id: user._id }, { $set: { lastSeen: new Date() } }).exec(); } catch {}
    return res.json({ success: true, data: { token, user } });
  } catch (err) {
    console.error("Refresh error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- Resend Verification ----------
router.post("/resend-verification", async (req, res) => {
  const { email, username } = req.body;
  if (!email && !username)
    return res.status(400).json({ error: "Email or username is required." });

  try {
    const query = email ? { Email: email } : { Username: username };
    const user = await User.findOne(query);
    if (!user) {
      // Return generic success to prevent user enumeration
      return res.status(200).json({ message: "If that account exists, a verification email has been sent." });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "If that account exists, a verification email has been sent." });
    }

    await sendVerificationEmail(user.Email, user, true);
    res
      .status(200)
      .json({ message: "Verification email resent successfully." });
  } catch (err) {
    console.error("Resend verification failed:", err.message);
    res.status(500).json({
      error: "Failed to send verification email. Please try again later.",
    });
  }
});

// Helper: mask email for display — e.g. "jo***@gmail.com"
function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

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
      // Return generic success even if email not found (prevent enumeration)
      return res.json({ success: true, maskedEmail: maskEmail(Email), message: "If an account exists with that email, a verification code has been sent." });
    }

    // Check 1-hour lockout
    if (user.resetLockedUntil && new Date() < user.resetLockedUntil) {
      const minsLeft = Math.ceil((user.resetLockedUntil - Date.now()) / 60000);
      return res.status(429).json({ success: false, locked: true, message: `Too many attempts. Password reset is locked for ${minsLeft} more minute(s).` });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    // Reset attempt counter on new code request
    user.resetAttempts = 0;
    user.resetLockedUntil = undefined;
    await user.save();

    await sendVerificationCode(user.Email, user, code);

    return res.json({ success: true, maskedEmail: maskEmail(user.Email), message: "If an account exists with that email, a verification code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- Verify Reset Code (unauthenticated) ----------
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { Email, code } = req.body;
    if (!Email || !code) {
      return res.status(400).json({ success: false, message: "Email and code are required" });
    }

    const user = await User.findOne({ Email });
    if (!user || !user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired code." });
    }

    if (new Date() > user.verificationCodeExpires) {
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new one." });
    }

    if (user.verificationCode !== String(code).trim()) {
      // Increment failed attempts
      user.resetAttempts = (user.resetAttempts || 0) + 1;
      if (user.resetAttempts >= 3) {
        user.resetLockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();
        return res.status(429).json({ success: false, locked: true, message: "Too many failed attempts. Password reset is locked for 1 hour." });
      }
      await user.save();
      return res.status(400).json({ success: false, attemptsLeft: 3 - user.resetAttempts, message: `Invalid verification code. ${3 - user.resetAttempts} attempt(s) remaining.` });
    }

    // Code is valid — generate a short-lived reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Code verified.", resetToken: rawToken });
  } catch (err) {
    console.error("Verify reset code error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- Resend Forgot-Password Code (unauthenticated) ----------
router.post("/resend-forgot-code", async (req, res) => {
  try {
    const { Email } = req.body;
    if (!Email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ Email });
    if (!user) {
      return res.json({ success: true, message: "If an account exists, a new code has been sent." });
    }

    // Check 1-hour lockout
    if (user.resetLockedUntil && new Date() < user.resetLockedUntil) {
      const minsLeft = Math.ceil((user.resetLockedUntil - Date.now()) / 60000);
      return res.status(429).json({ success: false, locked: true, message: `Too many attempts. Password reset is locked for ${minsLeft} more minute(s).` });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    // Reset attempt counter on new code
    user.resetAttempts = 0;
    user.resetLockedUntil = undefined;
    await user.save();

    await sendVerificationCode(user.Email, user, code);

    return res.json({ success: true, message: "If an account exists, a new code has been sent." });
  } catch (err) {
    console.error("Resend forgot code error:", err.message);
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

    // Validate password complexity for new password
    const pwError = validatePasswordComplexity(Password);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    // Hash the raw token from URL before lookup
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

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

    // Send credential change notification
    sendCredentialChangeNotification(user.Email, user, "password-reset").catch(() => {});

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

    // Validate new password complexity
    const pwError = validatePasswordComplexity(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
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

    // Send credential change notification
    sendCredentialChangeNotification(user.Email, user, "password").catch(() => {});

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- First-Time Password Change (authenticated, for mustChangePassword users) ----------
router.put("/first-login-change-password", requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: "New password is required" });
    }

    const pwError = validatePasswordComplexity(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.mustChangePassword) {
      return res.status(400).json({ success: false, message: "Password change is not required for this account." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.Password = hashed;
    user.mustChangePassword = false;
    await user.save();

    // Send credential change notification
    sendCredentialChangeNotification(user.Email, user, "first-login-password").catch(() => {});

    // Send verification code to email
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await sendVerificationCode(user.Email, user, code);

    return res.json({
      success: true,
      message: "Password changed. A verification code has been sent to your email.",
    });
  } catch (err) {
    console.error("First-login change password error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- Verify Code (authenticated) ----------
router.post("/verify-code", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "Verification code is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ success: false, message: "No verification code pending. Request a new one." });
    }

    if (new Date() > user.verificationCodeExpires) {
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: "Verification code has expired. Request a new one." });
    }

    if (user.verificationCode !== String(code).trim()) {
      return res.status(400).json({ success: false, message: "Invalid verification code." });
    }

    // Mark as verified and active
    user.isVerified = true;
    user.accountStatus = "active";
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Account verified successfully. Welcome!" });
  } catch (err) {
    console.error("Verify code error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- Resend Verification Code (authenticated) ----------
router.post("/resend-code", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isVerified && user.accountStatus === "active") {
      return res.status(400).json({ success: false, message: "Account is already verified." });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationCode(user.Email, user, code);

    return res.json({ success: true, message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Resend code error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- Protected Route ----------
router.get("/me", requireAuth, async (req, res) => {
  try {
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

// ===== Maintenance status (for UI) =====
// Allows authenticated users to know if maintenance is active and whether they are allowed to bypass it.
// This lives under /api/auth so it's reachable even when the maintenance gate is active.
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

export default router;
