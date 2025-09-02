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
      ? "Resent: Verify Your Email - RCT Loan Management System"
      : "Verify Your Email - RCT Loan Management System";

    const html = `
      <h2>Hello ${user.FullName || user.Username},</h2>
      <p>${isResend ? "This is a reminder." : "Thank you for registering!"} 
      Please verify your email by clicking the button below:</p>
      <a href="${verifyURL}" 
         style="display:inline-block;padding:10px 20px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:5px;">
        Verify Email
      </a>
      <p>If you did not create an account, ignore this email.</p>
    `;

    // Create transporter dynamically each time to avoid credential caching issues
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Only log success, avoid duplicate debug messages
    const info = await transporter.sendMail({
      from: `"RCT Loan Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`✅ Verification email sent to ${email}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send verification email to ${email}:`, err.message);
    throw new Error("Failed to send verification email. Check SMTP credentials.");
  }
}
