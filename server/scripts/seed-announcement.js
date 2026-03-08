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
  Title: "LMIS v2.5 — System Update (March 2026)",
  Content:
    "We've rolled out important improvements to the Loan Management Information System:\n\n" +
    "• Enhanced security — encrypted authentication, idle auto-logout, and role-based access controls.\n" +
    "• Faster page loads — optimized routing and data fetching across all modules.\n" +
    "• Accounting Center — financial analytics dashboard with real-time summaries.\n" +
    "• Reports — demand letters, account vouchers, and collection exports upgraded.\n" +
    "• Announcement Manager — redesigned with scheduling, priority levels, and login-page posting.\n" +
    "• Bug fixes — resolved console warnings and improved overall stability.\n\n" +
    "If you experience any issues, please contact your system administrator.",
  Priority: "high",
  isActive: true,
  showOnLogin: true,
  PostedBy: "System Administrator",
  PostedDate: new Date("2026-03-08T08:00:00.000Z"),
  ValidFrom: new Date("2026-03-08T00:00:00.000Z"),
  ExpirationDate: new Date("2026-04-30T23:59:59.000Z"),
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
