import LoanCollectionMetadata from "../models/LoanCollectionMetadata.js";
import LoanCollection from "../models/LoanCollection.js";
import LoanCycle from "../models/LoanCycle.js";

/**
 * Save parsed collections to metadata (temporary)
 */
export const saveParsedCollections = async (req, res) => {
  try {
    const { loanNo } = req.params;
    const { data } = req.body;

    if (!loanNo || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const formatted = data.map((d) => ({
      LoanNo: loanNo,
      PaymentDate: d.PaymentDate,
      CollectionReferenceNo: d.CollectionReferenceNo,
      CollectionPayment: d.CollectionPayment,
      RunningBalance: d.RunningBalance,
      Penalty: d.Penalty,
      RawLine: d.RawLine,
    }));

    await LoanCollectionMetadata.insertMany(formatted);
    res.json({ success: true, message: "Saved to metadata" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Commit metadata into final loan collections
 */
export const commitCollections = async (req, res) => {
  try {
    const { loanNo } = req.params;
    if (!loanNo) {
      return res
        .status(400)
        .json({ success: false, message: "Loan number required" });
    }

    const loanCycle = await LoanCycle.findOne({ LoanCycleNo: loanNo });
    if (!loanCycle) {
        return res.status(404).json({ success: false, message: "Loan cycle not found" });
    }

    const pending = await LoanCollectionMetadata.find({
      LoanNo: loanNo,
      Imported: false,
    });
    if (!pending.length) {
      return res.json({
        success: false,
        message: "No pending collections to import",
      });
    }

    const toInsert = pending.map((p) => ({
      AccountId: loanCycle.AccountId,
      ClientNo: loanCycle.ClientNo,
      LoanCycleNo: p.LoanNo, // Map LoanNo to LoanCycleNo
      PaymentDate: p.PaymentDate,
      CollectionReferenceNo: p.CollectionReferenceNo,
      CollectionPayment: p.CollectionPayment,
      RunningBalance: p.RunningBalance,
      Penalty: p.Penalty,
      Source: "imported",
    }));

    await LoanCollection.insertMany(toInsert);
    await LoanCollectionMetadata.updateMany(
      { LoanNo: loanNo },
      { Imported: true }
    );

    res.json({
      success: true,
      message: `Imported ${toInsert.length} collections successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};