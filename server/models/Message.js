import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // Sender / recipient
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],

    subject: { type: String, default: "" },
    body: { type: String, required: true },

    // Optional loan-application routing
    loanApplication: { type: mongoose.Schema.Types.ObjectId, ref: "LoanClientApplication" },
    isRouting: { type: Boolean, default: false }, // true = this is a routed loan app, not regular mail

    // Attachments (Drive metadata)
    attachments: [
      {
        fileName: String,
        mimeType: String,
        fileSize: Number,
        driveFileId: String,      // Google Drive file ID
        webViewLink: String,
        webContentLink: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Per-recipient state (allows each user to have independent folder state)
    recipientStates: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        folder: {
          type: String,
          enum: ["inbox", "archived", "deleted"],
          default: "inbox",
        },
        isRead: { type: Boolean, default: false },
        deletedAt: Date, // set when moved to deleted; auto-purge after 30 days
      },
    ],

    // Sender state
    senderFolder: {
      type: String,
      enum: ["sent", "archived", "deleted"],
      default: "sent",
    },
    senderDeletedAt: Date,

    // Thread support — replies reference parent
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    // Priority for routing
    priority: {
      type: String,
      enum: ["normal", "urgent", "low"],
      default: "normal",
    },
  },
  { timestamps: true }
);

// Index for fast folder queries
messageSchema.index({ "recipientStates.user": 1, "recipientStates.folder": 1 });
messageSchema.index({ sender: 1, senderFolder: 1 });
messageSchema.index({ loanApplication: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model("Message", messageSchema);
