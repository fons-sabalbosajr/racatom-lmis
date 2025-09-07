// utils/email.js
import nodemailer from "nodemailer";
import crypto from "crypto";
import User from "../models/UserAccount.js";

/**
 * Send verification email
 * @param {string} email - recipient email
 * @param {object} user - MongoDB user object
 * @param {boolean} isResend - true if resending
 */
export async function sendVerificationEmail(email, user, isResend = false) {
  try {
    // Generate verification token if missing
    if (!user.verificationToken) {
      user.verificationToken = crypto.randomBytes(32).toString("hex");
      await user.save();
    }

    const verifyURL = `${process.env.FRONTEND_URL}/verify/${user.verificationToken}`;
    const subject = isResend
      ? "Reminder: Verify Your Email - RCT Loan Management System"
      : "Verify Your Email - RCT Loan Management System";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #1a73e8;">Hello ${
          user.FullName || user.Username
        },</h2>
        <p>
          ${
            isResend
              ? "This is a quick reminder."
              : "Thank you for registering with us."
          }
          Please verify your email to activate your account.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyURL}" 
             style="display:inline-block; padding:12px 24px; background:#1a73e8; color:#fff; 
             text-decoration:none; font-weight:bold; border-radius:6px;">
            Verify Email
          </a>
        </div>

        <p style="color: #555; font-size: 14px;">
          For your security, this link will expire after use.  
          If you did not create an account, you can safely ignore this email.
        </p>

        <p style="color:#888; font-size: 12px; text-align:center; margin-top: 40px;">
          © ${new Date().getFullYear()} RCT Loan Management System
        </p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"RCT Loan Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (err) {
    console.error(
      `❌ Failed to send verification email to ${email}:`,
      err.message
    );
    throw new Error(
      "Failed to send verification email. Check SMTP credentials."
    );
  }
}

export async function sendResetPasswordEmail(email, rawToken) {
  try {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    const subject = "Reset Your Password - RCT Loan Management System";

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password for your account. If this was you, please click the button below:</p>
        
        <p style="margin: 20px 0;">
          <a href="${resetURL}" 
             style="background-color: #1a73e8; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>

        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn’t request a password reset, you can safely ignore this email. Your account will remain secure.</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #777;">© ${new Date().getFullYear()} RCT Loan Management System</p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"RCT Loan Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 Password reset email sent to ${email}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send reset password email to ${email}:`, err.message);
    throw new Error("Failed to send reset password email. Check SMTP credentials.");
  }
}

