import LoanDisbursed from "../models/LoanDisbursed.js";

// Get all loan disbursed (optional, for debugging/admin)
export const getAllLoanDisbursed = async (req, res) => {
  try {
    const loans = await LoanDisbursed.find();
    res.json({ success: true, data: loans });
  } catch (err) {
    console.error("Error fetching loan_disbursed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get loan disbursed by ClientNo
export const getLoanDisbursedByClientNo = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const loans = await LoanDisbursed.find({ ClientNo: clientNo }).sort({ Date_Encoded: -1 });

    if (!loans || loans.length === 0) {
      return res.status(404).json({ success: false, message: "No disbursed loans found for this client" });
    }

    res.json({ success: true, data: loans });
  } catch (err) {
    console.error("Error fetching loan_disbursed by client:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get loan disbursed by AccountId
export const getLoanDisbursedByAccountId = async (req, res) => {
  try {
    const { accountId } = req.params;
    const loan = await LoanDisbursed.findOne({ AccountId: accountId });

    if (!loan) {
      return res.status(404).json({ success: false, message: "No disbursed loan found with this AccountId" });
    }

    res.json({ success: true, data: loan });
  } catch (err) {
    console.error("Error fetching loan_disbursed by account:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
