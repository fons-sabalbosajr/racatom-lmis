// middleware/requireAuth.js
import jwt from "jsonwebtoken";
import User from "../models/UserAccount.js";

export default async function requireAuth(req, res, next) {
  // Prefer Authorization header (per-tab token) over shared cookie token
  const headerToken = req.headers?.authorization?.split?.(" ")[1];
  const cookieToken = req.cookies?.token;
  const token = headerToken || cookieToken;

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
    // Use 401 so clients treat it as an authentication failure and re-login
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
}
