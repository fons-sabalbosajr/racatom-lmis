import mongoose from "mongoose";

const LoanCollectorDocumentSchema = new mongoose.Schema(
  {
    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanCollector", required: true },
    collectorName: { type: String },
    collectorGeneratedId: { type: String },

    // Classification
    category: { type: String, enum: ["id", "requirements", "other"], default: "other" },
    type: { type: String, default: "other" }, // pdf, image, doc, sheet, other
    source: { type: String, default: "upload" }, // Google Drive, External, upload

    // File/link
    name: { type: String, required: true },
    link: { type: String }, // primary view link
    url: { type: String }, // optional alt link
    storagePath: { type: String },
    driveFileId: { type: String },

    // Metadata
    mimeType: { type: String },
    size: { type: Number },
    ext: { type: String },
    uploadedBy: { type: String },
  },
  { timestamps: true, collection: "loan_collector_documents" }
);

export default mongoose.model("LoanCollectorDocument", LoanCollectorDocumentSchema);
