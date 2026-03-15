import mongoose from "mongoose";

const groupChatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    avatar: { type: String }, // optional color or initials
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    settings: {
      onlyAdminsCanPost: { type: Boolean, default: false },
      onlyAdminsCanEdit: { type: Boolean, default: true },
      muteNotifications: { type: Boolean, default: false },
    },
    lastMessage: {
      body: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: Date,
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "group_chats" }
);

groupChatSchema.index({ members: 1 });
groupChatSchema.index({ "lastMessage.sentAt": -1 });

export default mongoose.model("GroupChat", groupChatSchema);
