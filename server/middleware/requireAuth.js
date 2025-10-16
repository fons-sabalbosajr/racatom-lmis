// middleware/requireAuth.js
import jwt from "jsonwebtoken";
import User from "../models/UserAccount.js";

export default async function requireAuth(req, res, next) {
  // Enforce Authorization header (per-tab/window token). Do NOT fall back to cookies
  // to prevent cross-tab/device session bleed where a shared cookie could override the
  // current tab's intended identity. The frontend attaches the Bearer token from
  // sessionStorage/localStorage per tab.
  const token = req.headers?.authorization?.split?.(" ")[1];

  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      try {
        console.warn("[requireAuth] Missing Authorization header. Url:", req.originalUrl, "X-Token-Source:", req.headers["x-token-source"]);
      } catch {}
    }
    return res.status(401).json({ success: false, message: "Unauthorized: No Bearer token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded should contain { id: ... }
    if (!decoded?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token payload" });
    }

    // fetch user from DB and attach full object (strip sensitive fields)
    // Fetch user
    const user = await User.findById(decoded.id).select("-Password -verificationToken -resetPasswordToken -resetPasswordExpires");
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // Lightweight presence: update lastSeen asynchronously (no await to avoid slowing down)
    try {
      User.updateOne({ _id: user._id }, { $set: { lastSeen: new Date() } }).exec();
    } catch {}

    req.user = user; // full mongoose document (has Position, _id, Username, etc.)
    return next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    // Use 401 so clients treat it as an authentication failure and re-login
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
}
