import Announcement from "../models/Announcement.js";

// ── helpers ──────────────────────────────────────────────────────
const ALLOWED_FIELDS = [
  "Title",
  "Content",
  "isActive",
  "showOnLogin",
  "Priority",
  "ValidFrom",
  "ExpirationDate",
  "PostedBy",
];

const pick = (obj, keys) =>
  keys.reduce((o, k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
    return o;
  }, {});

// ── PUBLIC: announcements shown on the Login page (no auth) ──────
export const getPublicAnnouncements = async (_req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      showOnLogin: true,
      $and: [
        { $or: [{ ExpirationDate: { $exists: false } }, { ExpirationDate: null }, { ExpirationDate: { $gt: now } }] },
        { $or: [{ ValidFrom: { $exists: false } }, { ValidFrom: null }, { ValidFrom: { $lte: now } }] },
      ],
    })
      .select("Title Content Priority PostedDate PostedBy")
      .sort({ Priority: -1, PostedDate: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET active announcements for the notification bell (authenticated) ──
export const getAnnouncements = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.json({ success: true, announcements: [] });
    }

    const now = new Date();

    const announcements = await Announcement.aggregate([
      {
        $match: {
          isActive: true,
          $or: [{ ExpirationDate: { $exists: false } }, { ExpirationDate: null }, { ExpirationDate: { $gt: now } }],
        },
      },
      { $sort: { PostedDate: -1 } },
      {
        $addFields: {
          isRead: {
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

// ── Mark all as read ─────────────────────────────────────────────
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

// ── Mark single as read ──────────────────────────────────────────
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

// ── GET all announcements for developer admin view ───────────────
export const getAllAnnouncementsAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .select("-readBy")
      .sort({ PostedDate: -1 })
      .lean();
    res.json({ success: true, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET stats for dashboard cards ────────────────────────────────
export const getAnnouncementStats = async (_req, res) => {
  try {
    const now = new Date();
    const all = await Announcement.find().select("isActive showOnLogin ExpirationDate ValidFrom").lean();

    let total = all.length;
    let active = 0;
    let inactive = 0;
    let expired = 0;
    let scheduled = 0;
    let loginPage = 0;

    for (const a of all) {
      const isExpired = a.ExpirationDate && new Date(a.ExpirationDate) < now;
      const isScheduled = a.ValidFrom && new Date(a.ValidFrom) > now;

      if (isExpired) expired++;
      else if (!a.isActive) inactive++;
      else if (isScheduled) scheduled++;
      else active++;

      if (a.showOnLogin) loginPage++;
    }

    res.json({ success: true, stats: { total, active, inactive, expired, scheduled, loginPage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── CREATE ───────────────────────────────────────────────────────
export const createAnnouncement = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    if (!data.Title || !data.Content) {
      return res.status(400).json({ success: false, message: "Title and Content are required" });
    }
    // Default PostedBy to the authenticated user's name
    if (!data.PostedBy && req.user) {
      data.PostedBy = req.user.FullName || req.user.Username || "System";
    }

    const newAnnouncement = new Announcement(data);
    await newAnnouncement.save();
    res.status(201).json({ success: true, announcement: newAnnouncement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── UPDATE ───────────────────────────────────────────────────────
export const updateAnnouncement = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
    );
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }
    res.json({ success: true, announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── TOGGLE fields (isActive / showOnLogin) ───────────────────────
export const toggleAnnouncementField = async (req, res) => {
  try {
    const { field } = req.body;
    if (!["isActive", "showOnLogin"].includes(field)) {
      return res.status(400).json({ success: false, message: "Invalid field" });
    }
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }
    announcement[field] = !announcement[field];
    await announcement.save();
    res.json({ success: true, announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DELETE ───────────────────────────────────────────────────────
export const deleteAnnouncement = async (req, res) => {
  try {
    const result = await Announcement.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
