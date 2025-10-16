import UserTheme from "../models/UserTheme.js";

// GET /api/theme/me
export const getMyTheme = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const doc = await UserTheme.findOne({ userId });
    return res.json({ success: true, data: doc || null });
  } catch (err) {
    console.error("getMyTheme error:", err);
    return res.status(500).json({ success: false, message: "Failed to load theme" });
  }
};

// PUT /api/theme/me
export const saveMyTheme = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { headerBg, siderBg } = req.body || {};
    const update = {};
    if (typeof headerBg === "string") update.headerBg = headerBg;
    if (typeof siderBg === "string") update.siderBg = siderBg;

    const doc = await UserTheme.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { new: true, upsert: true }
    );
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("saveMyTheme error:", err);
    return res.status(500).json({ success: false, message: "Failed to save theme" });
  }
};
