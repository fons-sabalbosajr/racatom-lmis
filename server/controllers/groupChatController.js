import GroupChat from "../models/GroupChat.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/UserAccount.js";
import { uploadToDrive } from "../utils/googleDrive.js";
import fs from "fs";

const GROUP_CHAT_DRIVE_FOLDER = "1BCFxLROG7Ji-Ri32TpAMKLtQP_UJH1EI";

// ─── Create Group Chat ───
export async function createGroupChat(req, res) {
  try {
    const userId = req.user._id;
    const { name, description, members, settings } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Group name is required" });
    }

    const memberIds = Array.isArray(members) ? members : [];
    // Always include creator as member and admin
    const allMembers = [...new Set([String(userId), ...memberIds.map(String)])];

    const group = await GroupChat.create({
      name: name.trim(),
      description: description || "",
      creator: userId,
      admins: [userId],
      members: allMembers,
      settings: settings || {},
    });

    // Create system message
    await GroupMessage.create({
      groupChat: group._id,
      sender: userId,
      body: `${req.user.FullName || req.user.Username} created the group "${name.trim()}"`,
      isSystem: true,
      readBy: [userId],
    });

    const populated = await GroupChat.findById(group._id)
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo")
      .populate("creator", "FullName Username Position Photo");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error("createGroupChat error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── List User's Group Chats ───
export async function getGroupChats(req, res) {
  try {
    const userId = req.user._id;
    const groups = await GroupChat.find({ members: userId, isArchived: false })
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo")
      .populate("lastMessage.sender", "FullName Username")
      .sort({ "lastMessage.sentAt": -1, updatedAt: -1 });

    return res.json({ success: true, data: groups });
  } catch (err) {
    console.error("getGroupChats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Get Group Chat Details ───
export async function getGroupChat(req, res) {
  try {
    const group = await GroupChat.findById(req.params.id)
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo")
      .populate("creator", "FullName Username Position Photo");

    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Verify user is a member
    if (!group.members.some((m) => String(m._id) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: "Not a member of this group" });
    }

    return res.json({ success: true, data: group });
  } catch (err) {
    console.error("getGroupChat error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Send Group Message ───
export async function sendGroupMessage(req, res) {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { body } = req.body;

    const hasAttachments = req.filesMeta && req.filesMeta.length > 0;
    if ((!body || !body.trim()) && !hasAttachments) {
      return res.status(400).json({ success: false, message: "Message body or attachment is required" });
    }

    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (!group.members.some((m) => String(m) === String(userId))) {
      return res.status(403).json({ success: false, message: "Not a member of this group" });
    }

    // Check if only admins can post
    if (group.settings?.onlyAdminsCanPost && !group.admins.some((a) => String(a) === String(userId))) {
      return res.status(403).json({ success: false, message: "Only admins can post in this group" });
    }

    // Handle file attachments
    const attachments = [];
    if (req.filesMeta && req.filesMeta.length) {
      for (const fileMeta of req.filesMeta) {
        const driveResult = await uploadToDrive({
          filepath: fileMeta.filepath,
          name: fileMeta.originalFilename,
          mimeType: fileMeta.mimetype,
          parents: [GROUP_CHAT_DRIVE_FOLDER],
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

    const msgBody = (body || "").trim();

    const msg = await GroupMessage.create({
      groupChat: groupId,
      sender: userId,
      body: msgBody || " ",
      attachments,
      readBy: [userId],
    });

    // Update group's lastMessage
    const lastBody = attachments.length > 0 && !msgBody
      ? `📎 ${attachments[0].fileName}`
      : msgBody.slice(0, 100);
    group.lastMessage = {
      body: lastBody,
      sender: userId,
      sentAt: new Date(),
    };
    await group.save();

    const populated = await GroupMessage.findById(msg._id)
      .populate("sender", "FullName Username Position Photo");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error("sendGroupMessage error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Get Group Messages ───
export async function getGroupMessages(req, res) {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (!group.members.some((m) => String(m) === String(userId))) {
      return res.status(403).json({ success: false, message: "Not a member" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [messages, total] = await Promise.all([
      GroupMessage.find({ groupChat: groupId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "FullName Username Position Photo"),
      GroupMessage.countDocuments({ groupChat: groupId }),
    ]);

    // Mark messages as read
    const unreadIds = messages
      .filter((m) => !m.readBy.some((r) => String(r) === String(userId)))
      .map((m) => m._id);
    if (unreadIds.length > 0) {
      await GroupMessage.updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { readBy: userId } }
      );
    }

    return res.json({
      success: true,
      data: messages.reverse(),
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("getGroupMessages error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Update Group Settings ───
export async function updateGroupChat(req, res) {
  try {
    const userId = req.user._id;
    const group = await GroupChat.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Only admins can update
    if (!group.admins.some((a) => String(a) === String(userId))) {
      return res.status(403).json({ success: false, message: "Only admins can edit group settings" });
    }

    const { name, description, settings } = req.body;
    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (settings !== undefined) {
      group.settings = { ...group.settings.toObject?.() ?? group.settings, ...settings };
    }
    await group.save();

    const populated = await GroupChat.findById(group._id)
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo");

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error("updateGroupChat error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Add Members ───
export async function addMembers(req, res) {
  try {
    const userId = req.user._id;
    const group = await GroupChat.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Any member can add new members
    if (!group.members.some((m) => String(m) === String(userId))) {
      return res.status(403).json({ success: false, message: "Only members can add new members" });
    }

    const { memberIds } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: "No members to add" });
    }

    // Validate users exist
    const validUsers = await User.find({ _id: { $in: memberIds } }).select("_id FullName");
    const newIds = validUsers
      .map((u) => String(u._id))
      .filter((id) => !group.members.some((m) => String(m) === id));

    if (newIds.length === 0) {
      return res.json({ success: true, message: "All users are already members" });
    }

    group.members.push(...newIds);
    await group.save();

    // System message
    const names = validUsers.filter((u) => newIds.includes(String(u._id))).map((u) => u.FullName).join(", ");
    await GroupMessage.create({
      groupChat: group._id,
      sender: userId,
      body: `${req.user.FullName || req.user.Username} added ${names} to the group`,
      isSystem: true,
      readBy: [userId],
    });

    const populated = await GroupChat.findById(group._id)
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo");

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error("addMembers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Remove Member ───
export async function removeMember(req, res) {
  try {
    const userId = req.user._id;
    const { memberId } = req.body;
    const group = await GroupChat.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isAdmin = group.admins.some((a) => String(a) === String(userId));
    const isSelf = String(memberId) === String(userId);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: "Only admins can remove members" });
    }

    // Cannot remove creator
    if (String(memberId) === String(group.creator)) {
      return res.status(400).json({ success: false, message: "Cannot remove the group creator" });
    }

    group.members = group.members.filter((m) => String(m) !== String(memberId));
    group.admins = group.admins.filter((a) => String(a) !== String(memberId));
    await group.save();

    // System message
    const removedUser = await User.findById(memberId).select("FullName");
    const action = isSelf ? "left" : "was removed from";
    await GroupMessage.create({
      groupChat: group._id,
      sender: userId,
      body: `${removedUser?.FullName || "A user"} ${action} the group`,
      isSystem: true,
      readBy: [userId],
    });

    const populated = await GroupChat.findById(group._id)
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo");

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error("removeMember error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Toggle Admin ───
export async function toggleAdmin(req, res) {
  try {
    const userId = req.user._id;
    const { memberId } = req.body;
    const group = await GroupChat.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (!group.admins.some((a) => String(a) === String(userId))) {
      return res.status(403).json({ success: false, message: "Only admins can manage admin roles" });
    }

    const isCurrentAdmin = group.admins.some((a) => String(a) === String(memberId));
    if (isCurrentAdmin) {
      // Don't remove last admin
      if (group.admins.length <= 1) {
        return res.status(400).json({ success: false, message: "Cannot remove the last admin" });
      }
      group.admins = group.admins.filter((a) => String(a) !== String(memberId));
    } else {
      group.admins.push(memberId);
    }
    await group.save();

    const populated = await GroupChat.findById(group._id)
      .populate("members", "FullName Username Position Photo")
      .populate("admins", "FullName Username Position Photo");

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error("toggleAdmin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Unread Count for Groups ───
export async function getGroupUnreadCount(req, res) {
  try {
    const userId = req.user._id;

    // Get all groups where user is member
    const groups = await GroupChat.find({ members: userId, isArchived: false }).select("_id");
    const groupIds = groups.map((g) => g._id);

    const count = await GroupMessage.countDocuments({
      groupChat: { $in: groupIds },
      readBy: { $ne: userId },
      sender: { $ne: userId },
    });

    return res.json({ success: true, count });
  } catch (err) {
    console.error("getGroupUnreadCount error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
