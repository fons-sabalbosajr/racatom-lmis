import express from "express";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAllAsRead,
  markAsRead,
  getAllAnnouncementsAdmin,
} from "../controllers/announcementController.js";

const router = express.Router();

router.get("/", getAnnouncements);
router.get("/all", getAllAnnouncementsAdmin);
router.post("/mark-all-as-read", markAllAsRead);
router.post("/", createAnnouncement);
router.put("/:id", updateAnnouncement);
router.post("/:id/mark-as-read", markAsRead);
router.delete("/:id", deleteAnnouncement);

export default router;
