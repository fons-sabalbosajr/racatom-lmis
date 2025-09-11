// models/LoanCollector.js
import mongoose from "mongoose";

const loanCollectorSchema = new mongoose.Schema(
  {
    GeneratedIDNumber: { type: String, required: true, unique: true },
    Name: { type: String, required: true },
    Address: { type: String },
    ContactNumber: { type: String },
    AlternateContactNumber: { type: String },
    EmploymentStatus: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
    Email: { type: String },
    EmploymentDate: { type: Date, required: true },
    Role: { type: String, default: "Collector" },
    AreaRoutes: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("LoanCollector", loanCollectorSchema, "loan_collectors");
