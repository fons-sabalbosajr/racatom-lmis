// utils/email.js
import nodemailer from "nodemailer";
import crypto from "crypto";
import User from "../models/UserAccount.js";

// Centralized app name used in email subjects and headers
const APP_NAME = process.env.APP_NAME || "RCT Loan Management Information System";

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

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
      .btn{display:inline-block;padding:14px 28px;border-radius:8px;background:var(--brand);color:#fff !important;text-decoration:none;font-weight:600;font-size:15px;}
      .btn:hover{background:var(--brand-dark)}
      .link-fallback{word-break:break-all;font-size:12px;color:var(--muted);margin-top:12px;}
      .note{margin-top:18px;font-size:12px;color:var(--muted)}
      .info-box{background:#f0f5ff;border:1px solid #d6e4ff;border-radius:8px;padding:14px 16px;margin:14px 0;}
      .info-box p{margin:4px 0;font-size:13px;}
      .footer{padding:18px 24px;text-align:center;color:var(--muted);font-size:12px;border-top:1px solid #edf2f7;}
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
          ${
            ctaText && ctaHref
              ? `
            <p style="text-align:center;margin-top:22px">
              <a class="btn" href="${ctaHref}" target="_blank">${ctaText}</a>
            </p>
            <p class="link-fallback">If the button doesn't work, copy and paste this link into your browser:<br/>${ctaHref}</p>
          `
              : ""
          }
          <div class="note">${footerNote}</div>
        </div>
        <div class="footer">${APP_NAME} &mdash; Secure Loan Management</div>
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

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");
    const verifyURL = `${frontendUrl}/verify/${user.verificationToken}`;
    const subject = isResend
      ? `[${APP_NAME}] Reminder: Verify your email`
      : `[${APP_NAME}] Verify your email`;

    const html = renderEmail({
      heading: isResend ? "Verification Reminder" : "Verify Your Email",
      subheading: `Hello ${user.FullName || user.Username}, welcome to ${APP_NAME}!`,
      bodyHtml: `
        <p>Thank you for creating your account. To get started, please verify your email address by clicking the button below.</p>
        <div class="info-box">
          <p><strong>Account:</strong> ${user.Username}</p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
        <p>Once verified, you'll be able to log in and access the system.</p>
        <p style="color:#718096;font-size:12px;">If you didn't create this account, you can safely ignore this email.</p>
      `,
      ctaText: "Verify My Email",
      ctaHref: verifyURL,
    });

    const transporter = createTransporter();

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
      err.message,
    );
    throw new Error(
      "Failed to send verification email. Check SMTP credentials.",
    );
  }
}

export async function sendResetPasswordEmail(email, rawToken) {
  try {
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");
    const resetURL = `${frontendUrl}/reset-password/${rawToken}`;

    const subject = `[${APP_NAME}] Password Reset Request`;

    const html = renderEmail({
      heading: "Password Reset",
      subheading: "We received a request to reset your password",
      bodyHtml: `
        <p>Someone (hopefully you) requested a password reset for your ${APP_NAME} account.</p>
        <p>Click the button below to set a new password:</p>
        <div class="info-box">
          <p><strong>This link expires in 1 hour</strong> for your security.</p>
          <p>After resetting, you'll be redirected to the login page.</p>
        </div>
        <p style="color:#718096;font-size:12px;">If you didn't request this, no action is needed — your password will remain unchanged.</p>
      `,
      ctaText: "Reset My Password",
      ctaHref: resetURL,
    });

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 Password reset email sent to ${email}`);
    return info;
  } catch (err) {
    console.error(
      `❌ Failed to send reset password email to ${email}:`,
      err.message,
    );
    throw new Error(
      "Failed to send reset password email. Check SMTP credentials.",
    );
  }
}

/**
 * Send verification code email (6-digit code for first-time login)
 */
export async function sendVerificationCode(email, user, code) {
  try {
    const subject = `[${APP_NAME}] Your Verification Code`;

    const html = renderEmail({
      heading: "Verification Code",
      subheading: `Hello ${user.FullName || user.Username}`,
      bodyHtml: `
        <p>Use the code below to verify your email address and complete your account setup:</p>
        <div style="text-align:center;margin:24px 0;">
          <div style="display:inline-block;background:#f0f5ff;border:2px solid #1a73e8;border-radius:12px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1a73e8;">${code}</div>
        </div>
        <div class="info-box">
          <p><strong>This code expires in 10 minutes</strong> for your security.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 Verification code sent to ${email}`);
    return true;
  } catch (err) {
    console.error(
      `❌ Failed to send verification code to ${email}:`,
      err.message,
    );
    throw new Error(
      "Failed to send verification code. Check SMTP credentials.",
    );
  }
}

/**
 * Send approval email with credentials (developer approved the account)
 */
export async function sendApprovalEmail(email, user, plainPassword) {
  try {
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");
    const subject = `[${APP_NAME}] Your Account Has Been Approved!`;

    const html = renderEmail({
      heading: "Account Approved",
      subheading: `Welcome to ${APP_NAME}, ${user.FullName}!`,
      bodyHtml: `
        <p>Your account request has been reviewed and approved. Here are your login credentials:</p>
        <div class="info-box">
          <p><strong>Username:</strong> ${user.Username}</p>
          <p><strong>Temporary Password:</strong> ${plainPassword}</p>
        </div>
        <p>When you log in for the first time, you will be asked to <strong>change your password</strong> and <strong>verify your email</strong> with a code sent to this address.</p>
        <p style="color:#718096;font-size:12px;">Keep your credentials safe. Do not share your password with anyone.</p>
      `,
      ctaText: "Log In Now",
      ctaHref: `${frontendUrl}/login`,
    });

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 Approval email sent to ${email}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send approval email to ${email}:`, err.message);
    throw new Error("Failed to send approval email. Check SMTP credentials.");
  }
}

/**
 * Send credential change notification email
 * @param {string} email - recipient email
 * @param {object} user - MongoDB user object
 * @param {string} changeType - e.g. "password", "username"
 * @param {object} details - optional extra info (e.g. { oldUsername, newUsername })
 */
export async function sendCredentialChangeNotification(
  email,
  user,
  changeType,
  details = {},
) {
  try {
    const changeLabels = {
      password: "Password Changed",
      username: "Username Changed",
      "first-login-password": "Password Changed (First Login)",
      "password-reset": "Password Reset Successfully",
    };

    const heading = changeLabels[changeType] || "Account Credentials Updated";
    const subject = `[${APP_NAME}] ${heading}`;

    let detailHtml = "";
    if (
      changeType === "username" &&
      details.oldUsername &&
      details.newUsername
    ) {
      detailHtml = `
        <div class="info-box">
          <p><strong>Old Username:</strong> ${details.oldUsername}</p>
          <p><strong>New Username:</strong> ${details.newUsername}</p>
        </div>`;
    }

    const html = renderEmail({
      heading,
      subheading: `Hello ${user.FullName || user.Username}`,
      bodyHtml: `
        <p>This is to inform you that your <strong>${changeType.replace(/-/g, " ")}</strong> has been changed on your ${APP_NAME} account.</p>
        ${detailHtml}
        <div class="info-box">
          <p><strong>Account:</strong> ${user.Username}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If you made this change, no further action is needed.</p>
        <p style="color:#e53e3e;font-size:13px;"><strong>If you did not make this change, please contact your system administrator immediately.</strong></p>
      `,
    });

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(
      `📧 Credential change notification (${changeType}) sent to ${email}`,
    );
    return true;
  } catch (err) {
    console.error(
      `❌ Failed to send credential change notification to ${email}:`,
      err.message,
    );
    // Don't throw — credential change notifications should not block the operation
    return false;
  }
}

/**
 * Send email notification when a user receives a new message while offline
 * @param {string} email - recipient email
 * @param {object} recipient - recipient user object
 * @param {object} sender - sender user object
 * @param {object} messageData - { subject, bodyPreview }
 */
export async function sendNewMessageNotification(
  email,
  recipient,
  sender,
  messageData,
) {
  try {
    const subject = `[${APP_NAME}] New message from ${sender.FullName || sender.Username}`;

    const bodyPreview = (messageData.bodyPreview || "").substring(0, 300);

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    const html = renderEmail({
      heading: "New Message",
      subheading: `Hello ${recipient.FullName || recipient.Username}`,
      bodyHtml: `
        <p>You have a new message in ${APP_NAME}.</p>
        <div class="info-box">
          <p><strong>From:</strong> ${sender.FullName || sender.Username} (${sender.Position || "Staff"})</p>
          <p><strong>Subject:</strong> ${messageData.subject || "(No Subject)"}</p>
        </div>
        ${
          bodyPreview
            ? `
        <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:14px 0;">
          <p style="margin:0;font-size:13px;color:#4a5568;white-space:pre-wrap;">${bodyPreview}${bodyPreview.length >= 300 ? "..." : ""}</p>
        </div>`
            : ""
        }
        <p style="color:#718096;font-size:12px;">Log in to view and reply to this message.</p>
      `,
      ctaText: "Open Messages",
      ctaHref: `${frontendUrl}/messaging`,
    });

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 New message notification sent to ${email}`);
    return true;
  } catch (err) {
    console.error(
      `❌ Failed to send message notification to ${email}:`,
      err.message,
    );
    return false;
  }
}

/**
 * Send resignation reminder email — notifies the employee that their account
 * will be deleted 30 days after resignation.
 */
export async function sendResignationReminderEmail(email, user) {
  try {
    const transporter = createTransporter();

    const resignedDate = user.resignedAt
      ? new Date(user.resignedAt)
      : new Date();
    const deleteDate = new Date(resignedDate);
    deleteDate.setDate(deleteDate.getDate() + 30);
    const daysRemaining = Math.max(
      0,
      Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24)),
    );

    const formattedResignDate = resignedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedDeleteDate = deleteDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = `[${APP_NAME}] Account Deletion Reminder`;

    const html = renderEmail({
      heading: "Account Deletion Reminder",
      subheading: `Dear ${user.FullName || user.Username},`,
      bodyHtml: `
        <p>This is a reminder that your account with <strong>${APP_NAME}</strong> has been marked as <strong>resigned</strong>.</p>
        <div class="info-box">
          <p><strong>Account:</strong> ${user.Username}</p>
          <p><strong>Resignation Date:</strong> ${formattedResignDate}</p>
          <p><strong>Scheduled Deletion:</strong> ${formattedDeleteDate}</p>
          <p><strong>Days Remaining:</strong> ${daysRemaining} day(s)</p>
        </div>
        <p>As per our data retention policy, your account and all associated data will be <strong>permanently deleted on ${formattedDeleteDate}</strong>.</p>
        <p>If you believe this is an error or need to retrieve any data before deletion, please contact the system administrator immediately.</p>
        <p style="color:#cf1322;font-weight:600;">⚠ This action is irreversible once the deletion date is reached.</p>
      `,
      footerNote: `This is an automated reminder from ${APP_NAME}. Please do not reply to this email.`,
    });

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 Resignation reminder sent to ${email}`);
    return true;
  } catch (err) {
    console.error(
      `❌ Failed to send resignation reminder to ${email}:`,
      err.message,
    );
    return false;
  }
}
