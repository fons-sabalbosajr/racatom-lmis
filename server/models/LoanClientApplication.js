// models/LoanClientApplication.js
import mongoose from "mongoose";

const LoanClientApplicationSchema = new mongoose.Schema(
  {
    // 🧾 Step 1 — General Information
    AccountId: { type: String, unique: true },
    FirstName: { type: String, required: true },
    MiddleName: { type: String },
    LastName: { type: String, required: true },
    NameSuffix: { type: String },
    DateOfBirth: { type: Date },
    Age: { type: Number },
    ContactNo: { type: String, required: true },
    AlternateContactNo: { type: String },
    Email: { type: String },
    CurrentAddress: { type: String },
    Occupation: { type: String },
    OccupationAddress: { type: String },
    LoanRecord: { type: Boolean, default: false },
    PreviousLoan: {
      Record: String,
      Date: Date,
      Amount: Number,
      Status: String,
    },
    CoMaker: {
      Name: String,
      Address: String,
      ContactNo: String,
      Relationship: String,
    },
    ApplicationDate: { type: Date, default: Date.now },
    SimilarApplicant: { type: Boolean, default: false },
    SimilarBorrower: { type: Boolean, default: false },
    SimilarMaker: { type: Boolean, default: false },

    // 📎 Step 2 — Document Requirements
    UploadedDocs: { type: Array, default: [] },

    // 💰 Step 3 — Loan Information
    LoanAmount: { type: Number, required: true },
    LoanTerms: { type: Number, required: true },
    PaymentMode: { type: String, required: true },
    "Processing Fee": { type: Number },
    "Interest Rate/Month": { type: Number },
    "Penalty Rate": { type: Number },
    "Notarial Rate": { type: Number },
    "Annotation Rate": { type: Number },
    "Insurance Rate": { type: Number },
    "Vat Rate": { type: Number },
    "Doc Rate": { type: Number },
    "Misc. Rate": { type: Number },

    // Computed loan fields from Step 3
    LoanType: { type: String },
    "Loan to be Disbursed": { type: Number },
    Amortization: { type: Number },
    "Total Loan to be Paid": { type: Number },

    // 🧾 Additional Loan Details
    LoanBalance: { type: Number },
    LoanCycle: { type: String },
    LoanDescription: { type: String },
    LoanStatus: {
      type: String,
      enum: ["FOR REVIEW", "APPROVED", "REJECTED", "ACTIVE", "CLOSED"],
      default: "FOR REVIEW",
    },

    // 🔄 Amended fields
    AmendedFromApplicant: String,
    AmendedFromBorrower: String,
    AmendedFromMaker: String,
    AmendedToApplicant: String,
    AmendedToBorrower: String,
    AmendedToMaker: String,

    // 📋 Admin Processing
    CloseLoanDate: Date,
    CreditInvestigation: { type: Boolean, default: false },
    CreditInvestigationDate: Date,
    ApprovalDate: Date,
    ApprovedBy: String,
    RoutedTo: Object,
    Remarks: String,

    // 🔴 Rejection Handling
    RejectionReason: { type: String },
    RejectedAt: { type: Date },

    // 🧹 Archiving/Cleanup helper
    IsArchived: { type: Boolean, default: false },

    // 💵 Payments & Ledger Fields
    DaysMissed: String,
    ORNumber: String,
    PaidToDate: String,
    PaymentAmount: String,
    PaymentDelay: String,
    Rebates: String,
    ReleaseSchedule: String,
    RenewalStatus: String,
    Savings: String,
  },
  {
    timestamps: true,
    collection: "loan_clients_application",
  }
);

export default mongoose.model(
  "LoanClientApplication",
  LoanClientApplicationSchema
);
