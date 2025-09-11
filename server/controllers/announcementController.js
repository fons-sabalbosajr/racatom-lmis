import Announcement from "../models/Announcement.js";

// GET all
export const getAnnouncements = async (req, res) => {
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
    if (!Title || !Content) return res.status(400).json({ success: false, message: "Missing fields" });

    const newAnnouncement = new Announcement({ Title, Content, isActive, ExpirationDate });
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
