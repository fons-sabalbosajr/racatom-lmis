import mongoose from "mongoose";

const UserThemeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, unique: true },
    headerBg: { type: String, default: null },
    siderBg: { type: String, default: null },
  },
  { timestamps: true, collection: "user_themes" }
);

export default mongoose.model("UserTheme", UserThemeSchema);
