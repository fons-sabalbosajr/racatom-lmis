// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";

// Load env variables
dotenv.config();

import authRoutes from "./routes/auth.js";

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" })); // Handles JSON & base64 photo data

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  })
);

// Morgan only in dev mode
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes
app.use("/api/auth", authRoutes);

// Server + DB connection
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || undefined,
  })
  .then(() => {
    //console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);
    console.log(`🚀 Server ready at: http://localhost:${PORT}`);
    app.listen(PORT);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
