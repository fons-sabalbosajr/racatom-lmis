import mongoose from "mongoose";

const LoanCycleSchema = new mongoose.Schema(
  {
    AccountId: { type: String, required: true },
    ClientNo: { type: String, required: true },
    LoanCycleNo: { type: String, required: true, unique: true },
    LoanType: String,
    LoanStatus: String,
    LoanTerm: String,
    LoanAmount: Number,
    PrincipalAmount: Number,
    LoanBalance: Number,
    LoanInterest: Number,
    Penalty: Number,
    PaymentMode: String,
    StartPaymentDate: Date,
    MaturityDate: Date,
    CollectorName: String,
    LoanProcessStatus: { type: String, enum: ["Approved", "Updated", "Released", "Pending", "Loan Released"] },
    Remarks: { type: String },
    Date_Encoded: Date,
    Date_Modified: Date,
  },
  { timestamps: true, collection: "loan_clients_cycles" }
);

LoanCycleSchema.index({ ClientNo: 1 });
LoanCycleSchema.index({ LoanStatus: 1 });
LoanCycleSchema.index({ PaymentMode: 1 });
LoanCycleSchema.index({ CollectorName: "text" });

export default mongoose.model("LoanCycle", LoanCycleSchema);