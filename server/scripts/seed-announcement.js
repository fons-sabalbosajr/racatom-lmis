/**
 * Seed: latest system-update announcement (shown on Login page)
 *
 * Usage:  node scripts/seed-announcement.js
 *
 * - Creates one "System Update" announcement with showOnLogin = true
 * - Safe to re-run: skips if a matching title already exists
 */

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/racatom_lmis";

const announcementSchema = new mongoose.Schema(
  {
    Title: String,
    Content: String,
    PostedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    showOnLogin: { type: Boolean, default: false },
    Priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    ValidFrom: Date,
    ExpirationDate: Date,
    PostedBy: { type: String, default: "System" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { collection: "announcements" }
);

const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);

const ANNOUNCEMENT = {
  Title: "LMIS v3.0 — System Update (March 2026)",
  Content:
    "Dear Team,\n\n" +
    "We are pleased to announce the release of LMIS v3.0 for the RCT Loan Management Information System. " +
    "This update introduces a range of enhancements designed to improve operational efficiency, security, and user experience across all modules.\n\n" +
    "KEY UPDATES\n\n" +
    "Dashboard & Analytics\n" +
    "• Loan Collections summary is now accessible directly from the Dashboard.\n" +
    "• Collection Rate and Loans by Collector cards have been redesigned with uniform card layouts.\n" +
    "• Activity Logs are now available under Developer Settings for system auditing.\n" +
    "• Accounting Center settings provide real-time financial analytics and summaries.\n\n" +
    "Messaging & Collaboration\n" +
    "• Group Chat functionality has been introduced, supporting group creation, member management, and admin controls.\n" +
    "• All employees can now be added as Group Chat members regardless of role or position.\n" +
    "• File and image attachments are now supported in Group Chat messages.\n" +
    "• Route Loan feature now includes Manager-level accounts in the recipient dropdown.\n\n" +
    "Loan Management\n" +
    "• Manual Entry for collections has been improved with a structured two-row layout and labeled input fields.\n" +
    "• Demand Letter generation and Account Voucher reports have been upgraded.\n" +
    "• Collector selection in forms now groups options by Position for easier identification.\n\n" +
    "Security & Authentication\n" +
    "• JWT token handling has been optimized with extended session duration and silent token refresh.\n" +
    "• Encrypted authentication, idle auto-logout, and role-based access controls remain in effect.\n\n" +
    "User Interface\n" +
    "• Responsive design improvements have been applied across all pages for mobile and tablet compatibility.\n" +
    "• Consistent styling and layout adjustments have been made system-wide.\n\n" +
    "Codebase\n" +
    "• Debug artifacts and unused code have been removed for improved performance and maintainability.\n" +
    "• System branding has been standardized to \"RCT Loan Management Information System\" across all modules.\n\n" +
    "Should you encounter any issues or have feedback regarding these updates, please contact your system administrator.\n\n" +
    "Thank you for your continued support.\n\n" +
    "— RACATOM-LMIS Administration",
  Priority: "high",
  isActive: true,
  showOnLogin: true,
  PostedBy: "System Administrator",
  PostedDate: new Date("2026-03-15T08:00:00.000Z"),
  ValidFrom: new Date("2026-03-15T00:00:00.000Z"),
  ExpirationDate: new Date("2026-05-31T23:59:59.000Z"),
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const exists = await Announcement.findOne({ Title: ANNOUNCEMENT.Title });
    if (exists) {
      console.log("Announcement already exists — skipping.");
    } else {
      await Announcement.create(ANNOUNCEMENT);
      console.log("✔  Announcement created successfully.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
