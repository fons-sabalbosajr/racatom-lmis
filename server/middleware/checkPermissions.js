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
      // SECURITY: Whitelist fields that non-developers can self-update
      const SELF_EDITABLE_FIELDS = new Set([
        "FullName",
        "Email",
        "Photo",
        "ContactNumber",
        "Address",
      ]);

      // Strip any fields that are NOT in the whitelist
      const safeBody = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        if (SELF_EDITABLE_FIELDS.has(key)) {
          safeBody[key] = value;
        }
      }

      // Replace req.body with sanitized version
      req.body = safeBody;
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

export const developerOnly = async (req, res, next) => {
  try {
    const loggedInUser = await getLoggedInUser(req);
    if (!loggedInUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const role = String(loggedInUser.Position || "").trim().toLowerCase();
    // Primary: Developer role
    if (role === "developer") {
      return next();
    }
    // Secondary: explicit permission to access database tools
    if (loggedInUser?.permissions?.menus?.settingsDatabase === true || loggedInUser?.permissions?.menus?.developerSettings === true) {
      return next();
    }
    return res.status(403).json({ success: false, message: "Developer access required." });
  } catch (err) {
    console.error("developerOnly error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Generic action permission checker.
 * Verifies that the logged-in user has the specified permission in their `permissions.actions` object.
 * Developers always pass. Non-developers are checked against the permission path.
 *
 * Usage: checkActionPermission("loans", "canEdit")
 *        checkActionPermission("collections", "canDelete")
 *
 * Permission paths checked against user.permissions.actions:
 *   user.permissions.actions[module][action] === true
 *
 * @param {string} module - The module name (e.g., "loans", "collections", "disbursements")
 * @param {string} action - The action name (e.g., "canView", "canEdit", "canDelete", "canCreate")
 */
export const checkActionPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const loggedInUser = await getLoggedInUser(req);
      if (!loggedInUser) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const role = String(loggedInUser.Position || "").trim().toLowerCase();

      // Developers and Administrators always have full access
      if (role === "developer" || role === "administrator") {
        return next();
      }

      // Check permissions.actions[module][action]
      const actions = loggedInUser?.permissions?.actions;
      if (actions && actions[module] && actions[module][action] === true) {
        return next();
      }

      // Also check flat permission flags (e.g., permissions.actions.canEdit)
      if (actions && actions[action] === true) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${action.replace("can", "").toLowerCase()} ${module}.`,
      });
    } catch (err) {
      console.error("checkActionPermission error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
};
