import Announcement from "../models/Announcement.js";

// GET all announcements for the current user (read and unread)
export const getAnnouncements = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.json({ success: true, announcements: [] });
    }

    const announcements = await Announcement.aggregate([
      // 1. Find all active announcements
      {
        $match: { isActive: true },
      },
      // 2. Sort by most recent
      {
        $sort: { PostedDate: -1 },
      },
      // 3. Add a new field 'isRead'
      {
        $addFields: {
          isRead: {
            // ✅ FIX: Use userId directly without wrapping it
            $in: [userId, { $ifNull: ["$readBy", []] }],
          },
        },
      },
    ]);

    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark all announcements as read for the current user
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await Announcement.updateMany(
      { readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, message: "All announcements marked as read." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark a single announcement as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    const announcementId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await Announcement.findByIdAndUpdate(announcementId, {
      $addToSet: { readBy: userId },
    });

    res.json({ success: true, message: "Announcement marked as read." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET all announcements for admin view
export const getAllAnnouncementsAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ PostedDate: -1 });
    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// CREATE
export const createAnnouncement = async (req, res) => {
  try {
    const { Title, Content, isActive, ExpirationDate } = req.body;
    if (!Title || !Content)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const newAnnouncement = new Announcement({
      Title,
      Content,
      isActive,
      ExpirationDate,
    });
    await newAnnouncement.save();
    res.status(201).json({ success: true, announcement: newAnnouncement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE
export const updateAnnouncement = async (req, res) => {
  try {
    const { Title, Content, isActive, ExpirationDate } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { Title, Content, isActive, ExpirationDate },
      { new: true }
    );
    res.json({ success: true, announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE
export const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
