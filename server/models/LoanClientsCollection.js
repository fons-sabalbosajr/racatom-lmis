import mongoose from "mongoose";

const LoanClientCollectionSchema = new mongoose.Schema(
  {
    LoanNo: { type: String, required: true },
    PaymentDate: Date,
    CollectionReferenceNo: String,
    CollectionPayment: Number,
    RunningBalance: Number,
    Penalty: Number,
    Source: { type: String, default: "imported" },
  },
  { timestamps: true }
);

export default mongoose.model("LoanClientCollection", LoanClientCollectionSchema);
