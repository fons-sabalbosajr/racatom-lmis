// models/LoanDisbursed.js

import mongoose from "mongoose";

const LoanDisbursedSchema = new mongoose.Schema(
  {
    AccountId: { type: String, required: true },
    LoanNo: { type: String, required: true },
    ClientNo: { type: String, required: true },
    LoanType: { type: String },
    LoanStatus: { type: String },
    LastName: { type: String },
    FirstName: { type: String },
    MiddleName: { type: String },
    CollectorName: { type: String },
    Barangay: { type: String },
    City: { type: String },
    Province: { type: String },
    LoanTerm: { type: String },
    // --- FIXED FIELDS ---
    LoanAmount: { type: Number },
    LoanAmortization: { type: Number },
    LoanBalance: { type: Number },
    Penalty: { type: Number },
    LoanInterest: { type: Number },
    PrincipalAmount: { type: Number },
    PaymentMode: { type: String },
    StartPaymentDate: { type: Date },
    MaturityDate: { type: Date },
    Date_Encoded: { type: Date },
    Date_Modified: { type: Date },
    LoanProcessStatus: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("LoanDisbursed", LoanDisbursedSchema, "loan_disbursed");