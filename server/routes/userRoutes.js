import express from "express";
import { getUsers } from "../controllers/userController.js";

const router = express.Router();

// GET /api/users
router.get("/", getUsers);

router.put("/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Convert base64 to Buffer for storage
    if (updateData.Photo) {
      updateData.Photo = Buffer.from(updateData.Photo, "base64");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});
export default router;
