import mongoose from "mongoose";

const LoanClientSchema = new mongoose.Schema(
  {
    AccountId: { type: String, required: true, unique: true },
    ClientNo: { type: String, required: true, unique: true },
    FirstName: String,
    MiddleName: String,
    LastName: String,
    Gender: String,
    CivilStatus: String,
    ContactNumber: String,
    AlternateContactNumber: String,
    Email: String,
    BirthAddress: String,
    DateOfBirth: Date,
    CompanyName: String,
    Occupation: String,
    MonthlyIncome: Number,
    NumberOfChildren: Number,
    Spouse: {
      FirstName: String,
      MiddleName: String,
      LastName: String,
    },
    WorkAddress: String,
    Barangay: String,
    City: String,
    Province: String,
    Date_Encoded: Date,
    Date_Modified: Date,
  },
  { timestamps: true, collection: "loan_clients" }
);

LoanClientSchema.index({
  LastName: "text",
  FirstName: "text",
  MiddleName: "text",
  ClientNo: "text",
  AccountId: "text",
  Email: "text",
  ContactNumber: "text",
});

export default mongoose.model("LoanClient", LoanClientSchema);
