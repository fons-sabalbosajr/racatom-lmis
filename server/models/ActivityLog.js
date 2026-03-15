import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String,
    fullName: String,
    position: String,
    action: { type: String, required: true }, // e.g. "LOGIN", "CREATE", "UPDATE", "DELETE", "UPLOAD", "EXPORT"
    module: String, // e.g. "Auth", "Loans", "Collections", "Messaging", "Settings"
    description: String,
    method: String, // HTTP method
    path: String, // API path
    statusCode: Number,
    ip: String,
    userAgent: String,
    meta: { type: mongoose.Schema.Types.Mixed }, // Extra data (e.g. affected record ID)
  },
  { timestamps: true, collection: "activity_logs" }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ module: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1 });

export default mongoose.model("ActivityLog", ActivityLogSchema);
