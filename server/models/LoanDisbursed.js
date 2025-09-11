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
    LoanAmount: { type: String },
    LoanAmortization: { type: String },
    LoanBalance: { type: String },
    Penalty: { type: String },
    LoanInterest: { type: String },
    PaymentMode: { type: String },
    StartPaymentDate: { type: String },
    MaturityDate: { type: String },
    Date_Encoded: { type: String },
    LoanProcessStatus: { type: String },
    PrincipalAmount: { type: String },
    Date_Modified: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("LoanDisbursed", LoanDisbursedSchema, "loan_disbursed");
