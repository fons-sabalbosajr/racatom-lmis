// models/LoanRate.js
import mongoose from "mongoose";

const loanRateSchema = new mongoose.Schema(
  {
    Type: { type: String, required: true },
    Principal: { type: Number, required: true },
    Term: { type: Number, required: true },
    Mode: { type: String, required: true },
    "Processing Fee": { type: Number, default: 0 },
    "Interest Rate/Month": { type: Number, default: 0 },
    "Notarial Rate": { type: Number, default: 0 },
    "Annotation Rate": { type: Number, default: 0 },
    "Insurance Rate": { type: Number, default: 0 },
    "Vat Rate": { type: Number, default: 0 },
    "Penalty Rate": { type: Number, default: 0 },
    "Doc Rate": { type: Number, default: 0 },
    "Misc. Rate": { type: Number, default: 0 },
  },
  { timestamps: true, collection: "loan_rate" } // <-- explicitly set collection
);

export default mongoose.model("LoanRate", loanRateSchema);
