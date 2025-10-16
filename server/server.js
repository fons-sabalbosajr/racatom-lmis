import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import moment from "moment";

import Announcement from "./models/Announcement.js"; // Import model for cron
import requireAuth from "./middleware/requireAuth.js";
import LoanClientApplication from "./models/LoanClientApplication.js";

import authRoutes from "./routes/auth.js";
import announcementRoute from "./routes/announcementRoute.js";
import loanRateRoute from "./routes/loanRateRoute.js";
import userRoutes from "./routes/userRoutes.js";
import collectorRoutes from "./routes/collectorRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import loanDisbursedRoutes from "./routes/loanDisburseRoutes.js";
import loanCollectionRoutes from "./routes/loanCollectionRoutes.js";
import dashboardRoutes from "./routes/dashboard.js";
import themeRoutes from "./routes/themeRoutes.js";

import loanCollectionImportRoutes from "./routes/loanCollectionImportRoutes.js";
import path from "path";
import fs from "fs";
import parseCollectionRoutes from "./routes/parseCollectionRoutes.js";
import loanClientApplicationRoute from "./routes/loanClientApplicationRoute.js";
import databaseRoutes from "./routes/databaseRoutes.js";
import runtimeFlags from "./utils/runtimeFlags.js";
import User from "./models/UserAccount.js";

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const hasDriveFolders = Boolean(
  (process.env.DRIVE_FOLDER_IMAGES_ID &&
    process.env.DRIVE_FOLDER_IMAGES_ID.trim()) ||
    (process.env.DRIVE_FOLDER_DOCS_ID &&
      process.env.DRIVE_FOLDER_DOCS_ID.trim()) ||
    (process.env.DRIVE_FOLDER_ID && process.env.DRIVE_FOLDER_ID.trim())
);
if (!hasDriveFolders) {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));
}

// Enable CORS with credentials (support multiple origins)
app.use(
  cors({
    origin: (origin, callback) => {
      const envList = (
        process.env.CLIENT_ORIGINS ||
        process.env.CLIENT_ORIGIN ||
        "http://localhost:5173"
      )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // In dev, allow any origin if not explicitly set
      if (!origin) return callback(null, true); // curl / server-to-server
      if (envList.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Dev logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Maintenance-mode gate: block non-developers when active
app.use(async (req, res, next) => {
  try {
    if (!runtimeFlags.maintenance) return next();

    // Allow auth routes to let developers log in
    if (req.path.startsWith("/api/auth")) return next();
    // Allow developers or users with DB-tools permissions to access while in maintenance
    const token =
      req.headers?.authorization?.split?.(" ")[1] || req.cookies?.token;
    if (!token)
      return res
        .status(503)
        .json({ success: false, message: "Maintenance mode active" });
    try {
      // reuse requireAuth logic minimally (avoid circular import): verify via User lookup on decoded token id
      const jwt = (await import("jsonwebtoken")).default;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        // Fetch role and permissions to decide bypass
        const u = await User.findById(decoded.id).select(
          "Position permissions"
        );
        const role = String(u?.Position || "")
          .trim()
          .toLowerCase();
        const hasDbPerm = !!(
          u?.permissions?.menus?.settingsDatabase === true ||
          u?.permissions?.menus?.developerSettings === true
        );
        if (role === "developer" || hasDbPerm) return next();
      }
    } catch (e) {
      // ignore and block below
    }
    return res
      .status(503)
      .json({ success: false, message: "Maintenance mode active" });
  } catch (err) {
    return res
      .status(503)
      .json({ success: false, message: "Maintenance mode" });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/announcements", requireAuth, announcementRoute);
app.use("/api/loan_rates", loanRateRoute);
app.use("/api/users", userRoutes);
app.use("/api/collectors", collectorRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/loan_disbursed", loanDisbursedRoutes);
app.use("/api/loan-collections", loanCollectionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/loan-collections", loanCollectionImportRoutes);
app.use("/api/parse", parseCollectionRoutes);
app.use("/api/loan_clients_application", loanClientApplicationRoute);
// Database maintenance (developer-only)
app.use("/api/database", databaseRoutes);
// Theme preferences per user
app.use("/api/theme", themeRoutes);

// Lightweight health check: confirms server is up and whether Drive config looks present
app.get("/api/health", (req, res) => {
  try {
    const driveConfigured = Boolean(
      (process.env.DRIVE_FOLDER_IMAGES_ID &&
        process.env.DRIVE_FOLDER_IMAGES_ID.trim()) ||
        (process.env.DRIVE_FOLDER_DOCS_ID &&
          process.env.DRIVE_FOLDER_DOCS_ID.trim()) ||
        (process.env.DRIVE_FOLDER_ID && process.env.DRIVE_FOLDER_ID.trim())
    );
    const secretsPaths = [
      path.join(process.cwd(), "secrets", "google_drive_credentials.json"),
      path.join(process.cwd(), "secrets", "rct-credentials.json"),
    ];
    const driveCredsFound =
      secretsPaths.some((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      }) ||
      Boolean(
        (process.env.DRIVE_KEY_FILE && process.env.DRIVE_KEY_FILE.trim()) ||
          (process.env.DRIVE_SA_KEY_BASE64 &&
            process.env.DRIVE_SA_KEY_BASE64.trim()) ||
          (process.env.DRIVE_SERVICE_ACCOUNT_JSON &&
            process.env.DRIVE_SERVICE_ACCOUNT_JSON.trim())
      );

    return res.json({
      success: true,
      server: "ok",
      mongo:
        mongoose.connection?.readyState === 1 ? "connected" : "not-connected",
      drive: {
        foldersConfigured: driveConfigured,
        credentialsPresent: !!driveCredsFound,
        sharePublic:
          String(process.env.DRIVE_SHARE_PUBLIC || "").toLowerCase() === "true",
      },
      env: {
        clientOrigins: (
          process.env.CLIENT_ORIGINS ||
          process.env.CLIENT_ORIGIN ||
          ""
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        port: process.env.PORT || 5000,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Default error handler (optional, improves debugging)
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ success: false, message: "Server error" });
});

// Run every midnight
cron.schedule("0 0 * * *", async () => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);

  const result = await LoanClientApplication.deleteMany({
    LoanStatus: "REJECTED",
    RejectedAt: { $lt: threshold },
  });

  if (result.deletedCount > 0) {
    console.log(
      `🧹 Cleaned ${result.deletedCount} stale rejected applications`
    );
  }
});

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME })
  .then(() => {
    console.log("MongoDB connected");

    // Start server
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Cron job: daily at 2:00 AM
    cron.schedule("0 2 * * *", async () => {
      try {
        const now = new Date();
        const oneYearAgo = moment().subtract(1, "years").toDate();

        // Delete expired announcements
        const expired = await Announcement.deleteMany({
          ExpirationDate: { $lte: now },
        });

        // Delete announcements older than 1 year + 7 days
        const oldToDelete = await Announcement.deleteMany({
          PostedDate: { $lte: moment(oneYearAgo).subtract(7, "days").toDate() },
        });

        if (expired.deletedCount > 0 || oldToDelete.deletedCount > 0) {
          console.log(
            `Auto-deleted announcements. Expired: ${expired.deletedCount}, Old: ${oldToDelete.deletedCount}`
          );
        }
      } catch (err) {
        console.error("Error running auto-delete cron:", err);
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
