// routes/userRoutes.js
import express from "express";
import { getUsers, getNextAccountId } from "../controllers/userController.js";
import User from "../models/UserAccount.js";
import { canUpdateUser, canDeleteUser, developerOnly } from "../middleware/checkPermissions.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// all routes require auth
router.use(requireAuth);

// GET /api/users
router.get("/", getUsers);

// GET /api/users/next-account-id
router.get("/next-account-id", getNextAccountId);

// PUT /api/users/:id
router.put("/:id", canUpdateUser, async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.Photo) {
      updateData.Photo = Buffer.from(updateData.Photo, "base64");
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("update user error:", err);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", canDeleteUser, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("delete user error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

// POST /api/users/:id/reset-password-email (Developer-only)
router.post("/:id/reset-password-email", developerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const crypto = (await import("crypto")).default;
    const { sendResetPasswordEmail } = await import("../utils/email.js");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    await sendResetPasswordEmail(user.Email, rawToken);
    return res.json({ success: true, message: "Reset email sent" });
  } catch (err) {
    console.error("reset-password-email error:", err);
    return res.status(500).json({ success: false, message: "Failed to send reset email" });
  }
});

// POST /api/users/:id/set-temp-password (Developer-only)
router.post("/:id/set-temp-password", developerOnly, async (req, res) => {
  try {
    const { tempPassword } = req.body;
    if (!tempPassword) return res.status(400).json({ success: false, message: "tempPassword is required" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const bcrypt = (await import("bcryptjs")).default;
    const nodemailer = (await import("nodemailer")).default;

    user.Password = await bcrypt.hash(tempPassword, 10);
    await user.save();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const APP_NAME = process.env.APP_NAME || "RCT Loan Management System";
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${APP_NAME} · Temporary password</title>
        <style>
          :root { --brand:#1a73e8; --brand-dark:#1558b1; --bg:#f6f9fc; --text:#2d3748; --muted:#718096; --card:#ffffff; }
          body{margin:0;padding:0;background:var(--bg);font-family:Segoe UI,Roboto,Arial,sans-serif;color:var(--text)}
          .wrap{padding:24px}
          .card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)}
          .hero{background:linear-gradient(135deg,#1a73e8 0%,#4f46e5 100%);padding:28px 24px;color:#fff}
          .app{font-size:14px;opacity:.9;letter-spacing:.6px}
          h1{margin:8px 0 0;font-size:22px}
          .content{padding:24px}
          p{line-height:1.6;margin:0 0 14px}
          .box{background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px}
          .footer{padding:18px 24px;text-align:center;color:#718096;font-size:12px}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="hero">
              <div class="app">${APP_NAME}</div>
              <h1>Temporary password set</h1>
            </div>
            <div class="content">
              <p>Hello ${user.FullName || user.Username},</p>
              <p>An administrator has set a temporary password for your account. Use the details below to log in, then change your password immediately from your profile.</p>
              <div class="box">
                <div><strong>Username:</strong> ${user.Username}</div>
                <div><strong>Temporary Password:</strong> ${tempPassword}</div>
              </div>
              <p>If you did not request this change, please contact support right away.</p>
            </div>
            <div class="footer">© ${new Date().getFullYear()} ${APP_NAME}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: user.Email,
      subject: `[${APP_NAME}] Temporary password for your account`,
      html,
    });

    return res.json({ success: true, message: "Temporary password set and emailed" });
  } catch (err) {
    console.error("set-temp-password error:", err);
    return res.status(500).json({ success: false, message: "Failed to set temporary password" });
  }
});

export default router;
