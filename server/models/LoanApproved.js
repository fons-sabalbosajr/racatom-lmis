// models/LoanApproved.js
import mongoose from "mongoose";

const LoanApprovedSchema = new mongoose.Schema(
  {
    AccountId: String,
    LoanNo: { type: String, index: true },
    ClientNo: String,
    LoanType: String,
    LoanStatus: String,
    LoanProcessStatus: String,

    LastName: String,
    FirstName: String,
    MiddleName: String,

    CollectorName: String,
    Barangay: String,
    City: String,
    Province: String,

    LoanTerm: String,
    LoanAmount: String,
    LoanAmortization: String,
    LoanBalance: String,
    Penalty: String,
    LoanInterest: String,

    PaymentMode: String,
    StartPaymentDate: String,
    MaturityDate: String,
    Date_Encoded: String,
    Date_Modified: String,

    AlternateContactNumber: String,
    BirthAddress: String,
    CivilStatus: String,
    CompanyName: String,
    ContactNumber: String,
    DateOfBirth: String,
    Email: String,
    Gender: String,
    MonthlyIncome: String,
    NumberOfChildren: String,
    Occupation: String,

    SpouseFirstName: String,
    SpouseLastName: String,
    SpouseMiddleName: String,

    WorkAddress: String,
  },
  { timestamps: true, collection: "loan_approved" }
);

// Indexes for faster search/filter
LoanApprovedSchema.index({
  LastName: "text",
  FirstName: "text",
  MiddleName: "text",
  LoanNo: "text",
  AccountId: "text",
  ClientNo: "text",
  CollectorName: "text",
  Barangay: "text",
  City: "text",
  Province: "text",
  LoanType: "text",
  LoanStatus: "text",
  PaymentMode: "text",
  Email: "text",
  SpouseFirstName: "text",
  SpouseLastName: "text",
  SpouseMiddleName: "text",
  Occupation: "text",
  CompanyName: "text",
  WorkAddress: "text",
  ContactNumber: "text",
  AlternateContactNumber: "text",
  LoanAmount: "text",
  LoanAmortization: "text",
  LoanBalance: "text",
  Penalty: "text",
  LoanInterest: "text",
});
LoanApprovedSchema.index({ LoanStatus: 1 });
LoanApprovedSchema.index({ PaymentMode: 1 });

export default mongoose.model("LoanApproved", LoanApprovedSchema);
