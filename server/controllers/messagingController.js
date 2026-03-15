import Message from "../models/Message.js";
import MessageSettings from "../models/MessageSettings.js";
import User from "../models/UserAccount.js";
import { uploadToDrive } from "../utils/googleDrive.js";
import { sendNewMessageNotification } from "../utils/email.js";
import fs from "fs";

// Consider a user "offline" if their lastSeen is older than this threshold
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const CHAT_FILES_DRIVE_FOLDER = "1BCFxLROG7Ji-Ri32TpAMKLtQP_UJH1EI";

// ─────────── Compose / Send ───────────
export async function sendMessage(req, res) {
  try {
    const senderId = req.user._id;
    const { subject, body, recipients, parentMessage, priority } = req.body;

    if (!body || !recipients || !recipients.length) {
      return res.status(400).json({ success: false, message: "Body and at least one recipient are required." });
    }

    // Validate recipient IDs exist
    const recipientIds = Array.isArray(recipients) ? recipients : [recipients];
    const validRecipients = await User.find({ _id: { $in: recipientIds } }).select("_id");
    if (!validRecipients.length) {
      return res.status(400).json({ success: false, message: "No valid recipients found." });
    }

    // Handle file attachments (uploaded via formidable middleware)
    const attachments = [];
    if (req.filesMeta && req.filesMeta.length) {
      for (const fileMeta of req.filesMeta) {
        const driveResult = await uploadToDrive({
          filepath: fileMeta.filepath,
          name: fileMeta.originalFilename,
          mimeType: fileMeta.mimetype,
          parents: [CHAT_FILES_DRIVE_FOLDER],
        });
        attachments.push({
          fileName: fileMeta.originalFilename,
          mimeType: fileMeta.mimetype,
          fileSize: fileMeta.size,
          driveFileId: driveResult.id,
          webViewLink: driveResult.webViewLink,
          webContentLink: driveResult.webContentLink,
        });
        // Clean up temp file
        try { fs.unlinkSync(fileMeta.filepath); } catch {}
      }
    }

    const recipientStates = validRecipients.map((r) => ({
      user: r._id,
      folder: "inbox",
      isRead: false,
    }));

    const msg = await Message.create({
      sender: senderId,
      recipients: validRecipients.map((r) => r._id),
      subject: subject || "(No Subject)",
      body,
      attachments,
      recipientStates,
      parentMessage: parentMessage || undefined,
      priority: priority || "normal",
      senderFolder: "sent",
    });

    const populated = await Message.findById(msg._id)
      .populate("sender", "FullName Username Position Photo")
      .populate("recipients", "FullName Username Position Photo");

    // Notify offline recipients via email
    notifyOfflineRecipients(req.user, validRecipients.map(r => r._id), {
      subject: subject || "(No Subject)",
      bodyPreview: body,
    });

    return res.status(201).json({ success: true, message: populated });
  } catch (err) {
    console.error("sendMessage error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Route Loan Application ───────────
export async function routeLoanApplication(req, res) {
  try {
    const senderId = req.user._id;
    const { subject, body, recipients, loanApplicationId, priority } = req.body;

    if (!recipients || !recipients.length || !loanApplicationId) {
      return res.status(400).json({ success: false, message: "Recipients and loan application are required." });
    }

    const recipientIds = Array.isArray(recipients) ? recipients : [recipients];
    const validRecipients = await User.find({ _id: { $in: recipientIds } }).select("_id");
    if (!validRecipients.length) {
      return res.status(400).json({ success: false, message: "No valid recipients found." });
    }

    // Handle file attachments
    const attachments = [];
    if (req.filesMeta && req.filesMeta.length) {
      for (const fileMeta of req.filesMeta) {
        const driveResult = await uploadToDrive({
          filepath: fileMeta.filepath,
          name: fileMeta.originalFilename,
          mimeType: fileMeta.mimetype,
          parents: [CHAT_FILES_DRIVE_FOLDER],
        });
        attachments.push({
          fileName: fileMeta.originalFilename,
          mimeType: fileMeta.mimetype,
          fileSize: fileMeta.size,
          driveFileId: driveResult.id,
          webViewLink: driveResult.webViewLink,
          webContentLink: driveResult.webContentLink,
        });
        try { fs.unlinkSync(fileMeta.filepath); } catch {}
      }
    }

    const recipientStates = validRecipients.map((r) => ({
      user: r._id,
      folder: "inbox",
      isRead: false,
    }));

    const msg = await Message.create({
      sender: senderId,
      recipients: validRecipients.map((r) => r._id),
      subject: subject || "Loan Application Routed",
      body: body || "A loan application has been routed for your review.",
      loanApplication: loanApplicationId,
      isRouting: true,
      attachments,
      recipientStates,
      priority: priority || "normal",
      senderFolder: "sent",
    });

    const populated = await Message.findById(msg._id)
      .populate("sender", "FullName Username Position Photo")
      .populate("recipients", "FullName Username Position Photo")
      .populate("loanApplication");

    // Notify offline recipients via email
    notifyOfflineRecipients(req.user, validRecipients.map(r => r._id), {
      subject: subject || "Loan Application Routed",
      bodyPreview: body || "A loan application has been routed for your review.",
    });

    return res.status(201).json({ success: true, message: populated });
  } catch (err) {
    console.error("routeLoanApplication error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── List Messages by Folder ───────────
export async function getMessages(req, res) {
  try {
    const userId = req.user._id;
    const { folder = "inbox", page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query;
    if (folder === "sent") {
      query = { sender: userId, senderFolder: "sent" };
    } else if (folder === "deleted-sent") {
      query = { sender: userId, senderFolder: "deleted" };
    } else {
      // inbox, archived, deleted
      query = {
        "recipientStates": {
          $elemMatch: { user: userId, folder },
        },
      };
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "FullName Username Position Photo")
        .populate("recipients", "FullName Username Position Photo")
        .populate("loanApplication", "AccountId FirstName LastName LoanAmount"),
      Message.countDocuments(query),
    ]);

    // Inject per-user read state
    const enriched = messages.map((m) => {
      const doc = m.toObject();
      const state = doc.recipientStates?.find((s) => String(s.user) === String(userId));
      doc.isRead = state ? state.isRead : true; // sender always "read"
      return doc;
    });

    return res.json({ success: true, messages: enriched, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("getMessages error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Get Single Message ───────────
export async function getMessage(req, res) {
  try {
    const userId = req.user._id;
    const msg = await Message.findById(req.params.id)
      .populate("sender", "FullName Username Position Photo")
      .populate("recipients", "FullName Username Position Photo")
      .populate("loanApplication")
      .populate("parentMessage");

    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    // Mark as read for this user
    const state = msg.recipientStates.find((s) => String(s.user) === String(userId));
    if (state && !state.isRead) {
      state.isRead = true;
      await msg.save();
    }

    return res.json({ success: true, message: msg });
  } catch (err) {
    console.error("getMessage error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Move Message to Folder ───────────
export async function moveMessage(req, res) {
  try {
    const userId = req.user._id;
    const { folder } = req.body; // "inbox", "archived", "deleted"
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    // Check if user is sender
    if (String(msg.sender) === String(userId)) {
      msg.senderFolder = folder === "inbox" ? "sent" : folder;
      if (folder === "deleted") msg.senderDeletedAt = new Date();
      else msg.senderDeletedAt = undefined;
      await msg.save();
      return res.json({ success: true, message: "Message moved." });
    }

    // Check if user is recipient
    const state = msg.recipientStates.find((s) => String(s.user) === String(userId));
    if (!state) return res.status(403).json({ success: false, message: "Not authorized" });

    state.folder = folder;
    if (folder === "deleted") state.deletedAt = new Date();
    else state.deletedAt = undefined;
    await msg.save();

    return res.json({ success: true, message: "Message moved." });
  } catch (err) {
    console.error("moveMessage error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Permanent Delete (from deleted folder) ───────────
export async function permanentDelete(req, res) {
  try {
    const userId = req.user._id;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    if (String(msg.sender) === String(userId)) {
      msg.senderFolder = "purged";
      await msg.save();
    } else {
      const state = msg.recipientStates.find((s) => String(s.user) === String(userId));
      if (state) {
        state.folder = "purged";
        await msg.save();
      }
    }

    return res.json({ success: true, message: "Message permanently deleted." });
  } catch (err) {
    console.error("permanentDelete error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Unread Count ───────────
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user._id;
    const count = await Message.countDocuments({
      "recipientStates": {
        $elemMatch: { user: userId, folder: "inbox", isRead: false },
      },
    });
    return res.json({ success: true, count });
  } catch (err) {
    console.error("getUnreadCount error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Mark as Read / Unread ───────────
export async function markReadStatus(req, res) {
  try {
    const userId = req.user._id;
    const { isRead } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    const state = msg.recipientStates.find((s) => String(s.user) === String(userId));
    if (state) {
      state.isRead = isRead;
      await msg.save();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("markReadStatus error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Messaging Settings ───────────
export async function getMessageSettings(req, res) {
  try {
    let settings = await MessageSettings.findOne({ user: req.user._id });
    if (!settings) {
      settings = await MessageSettings.create({ user: req.user._id });
    }
    return res.json({ success: true, settings });
  } catch (err) {
    console.error("getMessageSettings error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateMessageSettings(req, res) {
  try {
    const { emailNotifications, signature, autoArchiveDays } = req.body;
    let settings = await MessageSettings.findOne({ user: req.user._id });
    if (!settings) {
      settings = await MessageSettings.create({ user: req.user._id });
    }
    if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
    if (signature !== undefined) settings.signature = signature;
    if (autoArchiveDays !== undefined) settings.autoArchiveDays = autoArchiveDays;
    await settings.save();
    return res.json({ success: true, settings });
  } catch (err) {
    console.error("updateMessageSettings error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Get Staff Users (for compose recipient picker) ───────────
export async function getStaffUsers(req, res) {
  try {
    // Include all employees except resigned ones
    const users = await User.find({
      accountStatus: { $ne: "resigned" },
    })
      .select("FullName Username Position Photo _id accountStatus")
      .sort({ Position: 1, FullName: 1 });
    return res.json({ success: true, users });
  } catch (err) {
    console.error("getStaffUsers error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─────────── Notify Offline Recipients via Email ───────────
async function notifyOfflineRecipients(sender, recipientIds, messageData) {
  try {
    const now = new Date();
    const offlineThreshold = new Date(now.getTime() - OFFLINE_THRESHOLD_MS);

    // Find recipients who are offline (lastSeen older than threshold or never set)
    const offlineUsers = await User.find({
      _id: { $in: recipientIds },
      $or: [
        { lastSeen: { $lt: offlineThreshold } },
        { lastSeen: { $exists: false } },
        { lastSeen: null },
      ],
    }).select("FullName Username Email Position _id");

    // Check each offline user's messaging settings for emailNotifications preference
    for (const recipient of offlineUsers) {
      if (!recipient.Email) continue;

      try {
        const settings = await MessageSettings.findOne({ user: recipient._id });
        // Default is true if no settings record exists
        if (settings && settings.emailNotifications === false) continue;

        await sendNewMessageNotification(recipient.Email, recipient, sender, messageData);
      } catch (err) {
        console.error(`Failed to notify ${recipient.Email}:`, err.message);
      }
    }
  } catch (err) {
    console.error("notifyOfflineRecipients error:", err.message);
  }
}
