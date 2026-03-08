import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    Title: { type: String, required: true },
    Content: { type: String, required: true },
    PostedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    showOnLogin: { type: Boolean, default: false },
    Priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    ValidFrom: { type: Date },
    ExpirationDate: { type: Date },
    PostedBy: { type: String, default: "System" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserAccount" }],
  },
  { collection: "announcements" }
);

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
