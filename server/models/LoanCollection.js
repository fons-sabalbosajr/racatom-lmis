import mongoose from "mongoose";

const LoanCollectionSchema = new mongoose.Schema(
  {
    AccountId: { type: String, required: true },
    ClientNo: { type: String, required: true },
    LoanCycleNo: { type: String, required: true },
    PaymentDate: { type: Date },
    CollectorName: { type: String },
    PaymentMode: { type: String },
    CollectionReferenceNo: { type: String },
    Bank: { type: String },
    Branch: { type: String },
    Amortization: { type: mongoose.Schema.Types.Decimal128 },
    AmortizationPrincipal: { type: mongoose.Schema.Types.Decimal128 },
    AmortizationInterest: { type: mongoose.Schema.Types.Decimal128 },
    PrincipalDue: { type: mongoose.Schema.Types.Decimal128 },
    PrincipalPaid: { type: mongoose.Schema.Types.Decimal128 },
    PrincipalBalance: { type: mongoose.Schema.Types.Decimal128 },
    CollectedInterest: { type: mongoose.Schema.Types.Decimal128 },
    InterestPaid: { type: mongoose.Schema.Types.Decimal128 },
    TotalCollected: { type: mongoose.Schema.Types.Decimal128 },
    ActualCollection: { type: mongoose.Schema.Types.Decimal128 },
    CollectionPayment: { type: mongoose.Schema.Types.Decimal128 },
    RunningBalance: { type: mongoose.Schema.Types.Decimal128 },
    TotalLoanToPay: { type: mongoose.Schema.Types.Decimal128 },
    DateReceived: { type: Date },
    DateProcessed: { type: Date },
    // New Fields
    PaymentVia: { type: String },
    PaymentType: { type: String },
    OnlinePlatform: { type: String },
    OtherOnlinePlatform: { type: String },
    BankName: { type: String },
    OtherBankName: { type: String },
    OnlineRefNo: { type: String },
    BankRefNo: { type: String },
    Remarks: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("LoanCollection", LoanCollectionSchema, "loan_clients_collections");

// Performance indexes for lookups and latest update queries
LoanCollectionSchema.index({ LoanCycleNo: 1 });
LoanCollectionSchema.index({ AccountId: 1 });
LoanCollectionSchema.index({ ClientNo: 1 });
LoanCollectionSchema.index({ updatedAt: -1 });
// Optimize queries that filter by identifiers and sort by PaymentDate
LoanCollectionSchema.index({ LoanCycleNo: 1, AccountId: 1, ClientNo: 1, PaymentDate: 1 });
