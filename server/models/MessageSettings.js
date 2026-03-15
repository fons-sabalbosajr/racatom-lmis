import mongoose from "mongoose";

const messageSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    emailNotifications: { type: Boolean, default: true },
    signature: { type: String, default: "" },
    autoArchiveDays: { type: Number, default: 0 }, // 0 = disabled
  },
  { timestamps: true }
);

export default mongoose.model("MessageSettings", messageSettingsSchema);
