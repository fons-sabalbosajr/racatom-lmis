import User from "../models/UserAccount.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-verificationToken -resetPasswordToken -resetPasswordExpires");

    const usersWithPhoto = users.map(user => {
      const obj = user.toObject();

      // Convert Photo to base64 if exists
      if (obj.Photo && obj.Photo.length) obj.Photo = obj.Photo.toString("base64");
      else obj.Photo = null;

      // Mark plain-text passwords as not verified
      if (!obj.Password || !obj.Password.startsWith("$2b$")) {
        obj.isVerified = false;
      }

      return obj;
    });

    res.status(200).json(usersWithPhoto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};
