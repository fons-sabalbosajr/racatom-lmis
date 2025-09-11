// middleware/checkPermissions.js
import User from "../models/UserAccount.js";

const getLoggedInUser = async (req) => {
  // If requireAuth returns the full user doc, use it.
  if (req.user && req.user._id) return req.user;

  // If it's a decoded token { id }, fetch full user.
  if (req.user && req.user.id) {
    const u = await User.findById(req.user.id).select("-Password -verificationToken -resetPasswordToken -resetPasswordExpires");
    return u || null;
  }

  return null;
};

export const canUpdateUser = async (req, res, next) => {
  try {
    const loggedInUser = await getLoggedInUser(req);
    if (!loggedInUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const targetUserId = req.params.id;

    // Developer can edit anyone
    if (String(loggedInUser.Position).toLowerCase() === "developer") {
      return next();
    }

    // Non-developer can only edit their own profile
    if (String(loggedInUser._id) === String(targetUserId)) {
      // Block changing Position to Developer
      if (req.body.Position && req.body.Position === "Developer") {
        return res.status(403).json({
          success: false,
          message: "Only administrators can assign Developer role.",
        });
      }
      return next();
    }

    // otherwise block
    return res.status(403).json({ success: false, message: "You cannot edit other users." });
  } catch (err) {
    console.error("canUpdateUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const canDeleteUser = async (req, res, next) => {
  try {
    const loggedInUser = await getLoggedInUser(req);
    if (!loggedInUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Developers can delete anyone
    if (String(loggedInUser.Position).toLowerCase() === "developer") {
      return next();
    }

    return res.status(403).json({ success: false, message: "Only Developers can delete accounts." });
  } catch (err) {
    console.error("canDeleteUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
