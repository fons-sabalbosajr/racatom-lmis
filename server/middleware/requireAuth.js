// middleware/requireAuth.js
import jwt from "jsonwebtoken";
import User from "../models/UserAccount.js";

export default async function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers?.authorization?.split?.(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded should contain { id: ... }
    if (!decoded?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token payload" });
    }

    // fetch user from DB and attach full object (strip sensitive fields)
    const user = await User.findById(decoded.id).select("-Password -verificationToken -resetPasswordToken -resetPasswordExpires");
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    req.user = user; // full mongoose document (has Position, _id, Username, etc.)
    return next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    return res.status(403).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
}
