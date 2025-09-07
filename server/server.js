import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";


import authRoutes from "./routes/auth.js";
import announcementRoute from "./routes/announcementRoute.js";
import loanRateRoute from "./routes/loanRateRoute.js";
import userRoutes from "./routes/userRoutes.js";


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
app.use("/api/announcements", announcementRoute);
app.use("/api/loan_rates", loanRateRoute);
app.use("/api/users", userRoutes);

// Default error handler (optional, improves debugging)
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ success: false, message: "Server error" });
});

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME })
  .then(() => {
    //console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
