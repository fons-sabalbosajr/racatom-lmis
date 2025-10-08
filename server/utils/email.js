// utils/email.js
import nodemailer from "nodemailer";
import crypto from "crypto";
import User from "../models/UserAccount.js";

// Centralized app name used in email subjects and headers
const APP_NAME = process.env.APP_NAME || "RCT Loan Management System";

// Shared, branded email layout
function renderEmail({
  title = APP_NAME,
  heading = "",
  subheading = "",
  bodyHtml = "",
  ctaText,
  ctaHref,
  footerNote = `© ${new Date().getFullYear()} ${APP_NAME}`,
}) {
  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        --brand:#1a73e8;
        --brand-dark:#1558b1;
        --bg:#f6f9fc;
        --text:#2d3748;
        --muted:#718096;
        --card:#ffffff;
      }
      body{margin:0;padding:0;background:var(--bg);font-family:Segoe UI,Roboto,Arial,sans-serif;color:var(--text);}
      .wrapper{padding:24px;}
      .card{max-width:640px;margin:0 auto;background:var(--card);border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)}
      .hero{background:linear-gradient(135deg,#1a73e8 0%,#4f46e5 100%);padding:28px 24px;color:#fff}
      .app{font-size:14px;opacity:.9;letter-spacing:.6px}
      h1{margin:8px 0 0;font-size:22px}
      h2{margin:0;font-size:16px;font-weight:500;opacity:.95}
      .content{padding:24px}
      p{line-height:1.6;margin:0 0 14px}
      .btn{display:inline-block;padding:12px 20px;border-radius:8px;background:var(--brand);color:#fff;text-decoration:none;font-weight:600}
      .btn:hover{background:var(--brand-dark)}
      .note{margin-top:18px;font-size:12px;color:var(--muted)}
      .footer{padding:18px 24px;text-align:center;color:var(--muted);font-size:12px}
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="hero">
          <div class="app">${APP_NAME}</div>
          ${heading ? `<h1>${heading}</h1>` : ""}
          ${subheading ? `<h2>${subheading}</h2>` : ""}
        </div>
        <div class="content">
          ${bodyHtml}
          ${ctaText && ctaHref ? `<p style="text-align:center;margin-top:22px"><a class="btn" href="${ctaHref}">${ctaText}</a></p>` : ""}
          <div class="note">${footerNote}</div>
        </div>
        <div class="footer">${APP_NAME}</div>
      </div>
    </div>
  </body>
  </html>`;
}

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
      ? `[${APP_NAME}] Reminder: Verify your email`
      : `[${APP_NAME}] Verify your email`;

    const html = renderEmail({
      heading: "Verify your email",
      subheading: `Hello ${user.FullName || user.Username}, and welcome!`,
      bodyHtml: `
        <p>Thanks for signing up. Please confirm your email address to activate your ${APP_NAME} account.</p>
        <p>If you didn’t create an account, you can safely ignore this email.</p>
      `,
      ctaText: "Verify Email",
      ctaHref: verifyURL,
    });

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
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
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

    const subject = `[${APP_NAME}] Password reset`;

    const html = renderEmail({
      heading: "Password reset request",
      subheading: "Let’s get you back into your account",
      bodyHtml: `
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <p><strong>For your security, this link expires in 1 hour.</strong></p>
        <p>If you didn’t request this, you can safely ignore this message—your account remains secure.</p>
      `,
      ctaText: "Reset Password",
      ctaHref: resetURL,
    });

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
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
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

