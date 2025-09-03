import express from "express";
import { getAnnouncements, createAnnouncement } from "../controllers/announcementController.js";

const router = express.Router();

// GET /api/announcements - fetch all
router.get("/", getAnnouncements);

// POST /api/announcements - create new
router.post("/", createAnnouncement);

export default router;
