import mongoose from "mongoose";

const LoanCollectionMetadataSchema = new mongoose.Schema(
  {
    LoanNo: { type: String, required: true },
    PaymentDate: { type: Date },
    CollectionReferenceNo: { type: String },
    CollectionPayment: { type: mongoose.Schema.Types.Decimal128 },
    RunningBalance: { type: mongoose.Schema.Types.Decimal128 },
    Penalty: { type: mongoose.Schema.Types.Decimal128 },
    RawLine: { type: String },
    Imported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("LoanCollectionMetadata", LoanCollectionMetadataSchema, "loan_collection_metadata");