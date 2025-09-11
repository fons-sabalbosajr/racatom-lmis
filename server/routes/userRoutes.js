// routes/userRoutes.js
import express from "express";
import { getUsers } from "../controllers/userController.js";
import User from "../models/UserAccount.js";
import { canUpdateUser, canDeleteUser } from "../middleware/checkPermissions.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// all routes require auth
router.use(requireAuth);

// GET /api/users
router.get("/", getUsers);

// PUT /api/users/:id
router.put("/:id", canUpdateUser, async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.Photo) {
      updateData.Photo = Buffer.from(updateData.Photo, "base64");
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("update user error:", err);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", canDeleteUser, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("delete user error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

export default router;
