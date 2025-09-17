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
    LoanAmount: Number,
    LoanAmortization: Number,
    LoanBalance: Number,
    Penalty: Number,
    LoanInterest: Number,

    PaymentMode: String,
    StartPaymentDate: Date,
    MaturityDate: Date,
    Date_Encoded: Date,
    Date_Modified: Date,

    AlternateContactNumber: String,
    BirthAddress: String,
    CivilStatus: String,
    CompanyName: String,
    ContactNumber: String,
    DateOfBirth: Date,
    Email: String,
    Gender: String,
    MonthlyIncome: Number,
    NumberOfChildren: Number,
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
});
LoanApprovedSchema.index({ LoanStatus: 1 });
LoanApprovedSchema.index({ PaymentMode: 1 });

export default mongoose.model("LoanApproved", LoanApprovedSchema);
