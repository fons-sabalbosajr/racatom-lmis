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

import loanCollectionImportRoutes from "./routes/loanCollectionImportRoutes.js";

import parseCollectionRoutes from "./routes/parseCollectionRoutes.js";
import loanClientApplicationRoute from "./routes/loanClientApplicationRoute.js";


const app = express();

// Middleware
app.use(express.json({ limit: "10mb" })); // parse JSON body
app.use(cookieParser()); // parse cookies

// Enable CORS with credentials
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // frontend URL
    credentials: true, // allow cookies to be sent
  })
);

// Dev logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

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
    console.log(`🧹 Cleaned ${result.deletedCount} stale rejected applications`);
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
