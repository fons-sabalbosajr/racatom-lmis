import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import uploadLoanDocument from "../middleware/uploadLoanDocument.js";
import {
  sendMessage,
  routeLoanApplication,
  getMessages,
  getMessage,
  moveMessage,
  permanentDelete,
  getUnreadCount,
  markReadStatus,
  getMessageSettings,
  updateMessageSettings,
  getStaffUsers,
} from "../controllers/messagingController.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Staff users for recipient picker
router.get("/staff-users", getStaffUsers);

// Messaging settings
router.get("/settings", getMessageSettings);
router.put("/settings", updateMessageSettings);

// Unread count (for badge)
router.get("/unread-count", getUnreadCount);

// List messages by folder: ?folder=inbox|sent|archived|deleted
router.get("/", getMessages);

// Get single message
router.get("/:id", getMessage);

// Send a regular message (with optional file attachments)
router.post("/send", uploadLoanDocument, sendMessage);

// Route a loan application to manager
router.post("/route-loan", uploadLoanDocument, routeLoanApplication);

// Move message to folder (archive, delete, restore)
router.put("/:id/move", moveMessage);

// Mark read / unread
router.put("/:id/read-status", markReadStatus);

// Permanent delete
router.delete("/:id", permanentDelete);

export default router;
