import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupChat: { type: mongoose.Schema.Types.ObjectId, ref: "GroupChat", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    attachments: [
      {
        fileName: String,
        mimeType: String,
        fileSize: Number,
        driveFileId: String,
        webViewLink: String,
        webContentLink: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isSystem: { type: Boolean, default: false }, // for join/leave/rename events
  },
  { timestamps: true, collection: "group_messages" }
);

groupMessageSchema.index({ groupChat: 1, createdAt: -1 });
groupMessageSchema.index({ sender: 1 });

export default mongoose.model("GroupMessage", groupMessageSchema);
