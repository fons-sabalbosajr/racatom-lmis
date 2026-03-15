import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import optionalUpload from "../middleware/optionalUpload.js";
import {
  createGroupChat,
  getGroupChats,
  getGroupChat,
  updateGroupChat,
  sendGroupMessage,
  getGroupMessages,
  addMembers,
  removeMember,
  toggleAdmin,
  getGroupUnreadCount,
} from "../controllers/groupChatController.js";

const router = express.Router();
router.use(requireAuth);

// Group management
router.get("/", getGroupChats);
router.post("/", createGroupChat);
router.get("/unread-count", getGroupUnreadCount);
router.get("/:id", getGroupChat);
router.put("/:id", updateGroupChat);

// Members
router.post("/:id/members", addMembers);

// Messages (with optional file attachment support)
router.post("/:groupId/messages", optionalUpload, sendGroupMessage);
router.get("/:groupId/messages", getGroupMessages);
router.delete("/:id/members", removeMember);
router.put("/:id/toggle-admin", toggleAdmin);

export default router;
