import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    Title: { type: String, required: true },
    Content: { type: String, required: true },
    PostedDate: { type: Date, default: Date.now },
  },
  { collection: "announcements" }
);

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
