import mongoose from "mongoose";

const AccountingTermSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["Income", "Expense", "Asset", "Liability", "Equity", "Other"],
      default: "Other",
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "accounting_terms" }
);

AccountingTermSchema.index({ category: 1 });
AccountingTermSchema.index({ isActive: 1 });

export default mongoose.model("AccountingTerm", AccountingTermSchema);
