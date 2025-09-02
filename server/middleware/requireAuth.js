// server/middleware/requireAuth.js
import jwt from "jsonwebtoken";

export default function requireAuth(req, res, next) {
  const token = req.cookies?.token; // read JWT from cookie

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id }
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
}
