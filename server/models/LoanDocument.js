import mongoose from "mongoose";

const LoanDocumentSchema = new mongoose.Schema(
  {
    ClientNo: { type: String, required: true, index: true },
    AccountId: { type: String, index: true },
  LoanCycleNo: { type: String, index: true },
    name: { type: String, required: true },
    // If it's an uploaded file
    storagePath: { type: String }, // relative path on disk
    url: { type: String }, // public URL (/uploads/...)
    // If it's an external / Google Drive link
    link: { type: String },
    type: { type: String, enum: ["pdf", "image", "doc", "sheet", "other"], default: "other" },
    source: { type: String, default: "upload" }, // upload | Google Drive | External
    mimeType: { type: String },
    size: { type: Number },
    ext: { type: String },
    uploadedBy: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount" },
      username: String,
      position: String,
    },
  },
  { timestamps: true, collection: "loan_documents" }
);

export default mongoose.model("LoanDocument", LoanDocumentSchema);
