import Announcement from "../models/Announcement.js";

// Get all announcements (latest first)
export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ PostedDate: -1 });
    res.json({ success: true, announcements });
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create a new announcement
export const createAnnouncement = async (req, res) => {
  try {
    const { Title, Content } = req.body;
    if (!Title || !Content) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const newAnnouncement = new Announcement({ Title, Content });
    await newAnnouncement.save();
    res.status(201).json({ success: true, announcement: newAnnouncement });
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
