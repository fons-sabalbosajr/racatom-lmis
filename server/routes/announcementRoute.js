import express from "express";
import {
  getAnnouncements,
  getPublicAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAllAsRead,
  markAsRead,
  getAllAnnouncementsAdmin,
  getAnnouncementStats,
  toggleAnnouncementField,
} from "../controllers/announcementController.js";
import { developerOnly } from "../middleware/checkPermissions.js";

const router = express.Router();

// ── Authenticated user endpoints (notification bell) ─────────────
router.get("/", getAnnouncements);
router.post("/mark-all-as-read", markAllAsRead);
router.post("/:id/mark-as-read", markAsRead);

// ── Developer-only admin endpoints ──────────────────────────────
router.get("/all", developerOnly, getAllAnnouncementsAdmin);
router.get("/stats", developerOnly, getAnnouncementStats);
router.post("/", developerOnly, createAnnouncement);
router.put("/:id", developerOnly, updateAnnouncement);
router.patch("/:id/toggle", developerOnly, toggleAnnouncementField);
router.delete("/:id", developerOnly, deleteAnnouncement);

export default router;
