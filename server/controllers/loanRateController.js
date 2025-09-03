// controllers/loanRateController.js
import LoanRate from "../models/LoanRate.js";

// Get all loan rates
export const getLoanRates = async (req, res) => {
  try {
    const rates = await LoanRate.find();
    res.json(rates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch loan rates" });
  }
};

// Create new loan rate
export const createLoanRate = async (req, res) => {
  try {
    const newRate = new LoanRate(req.body);
    await newRate.save();
    res.json(newRate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create loan rate" });
  }
};

// Update loan rate by ID
export const updateLoanRate = async (req, res) => {
  try {
    const updatedRate = await LoanRate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRate) return res.status(404).json({ success: false, message: "Loan rate not found" });
    res.json(updatedRate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update loan rate" });
  }
};

// Delete loan rate by ID
export const deleteLoanRate = async (req, res) => {
  try {
    const deleted = await LoanRate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Loan rate not found" });
    res.json({ success: true, message: "Loan rate deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete loan rate" });
  }
};
