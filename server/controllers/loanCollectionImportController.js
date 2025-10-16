import LoanCollectionMetadata from "../models/LoanCollectionMetadata.js";
import LoanCollection from "../models/LoanCollection.js";
import LoanCycle from "../models/LoanCycle.js";
import LoanClientCollection from "../models/LoanClientsCollection.js";

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

/**
 * Import collections from existing collection database into main LoanCollection,
 * based on LoanCycleNo (and implied AccountId/ClientNo from that cycle).
 * Optional filters: startDate, endDate
 */
export const importFromExistingDatabase = async (req, res) => {
  try {
    const { loanCycleNo, clientNo, startDate, endDate } = req.body || {};
    if (!loanCycleNo) {
      return res.status(400).json({ success: false, message: "loanCycleNo is required" });
    }

    // Resolve canonical LoanCycle for AccountId/ClientNo mapping
    const loanCycle = await LoanCycle.findOne({ LoanCycleNo: loanCycleNo });
    if (!loanCycle) {
      return res.status(404).json({ success: false, message: "Loan cycle not found" });
    }
    if (clientNo && String(clientNo) !== String(loanCycle.ClientNo)) {
      return res.status(400).json({ success: false, message: "Provided ClientNo does not match the loan cycle" });
    }

    // Build query for legacy table
    const q = { LoanNo: loanCycleNo };
    if (startDate || endDate) {
      const rng = {};
      if (startDate) rng.$gte = new Date(startDate);
      if (endDate) rng.$lte = new Date(endDate);
      q.PaymentDate = rng;
    }

    const legacy = await LoanClientCollection.find(q).sort({ PaymentDate: 1, _id: 1 });
    if (!legacy || legacy.length === 0) {
      return res.json({ success: true, data: { inserted: 0, skipped: 0 }, message: "No records found from database" });
    }

    // Fetch existing to dedupe
    const existing = await LoanCollection.find({ LoanCycleNo: loanCycleNo }).select(
      "LoanCycleNo PaymentDate CollectionReferenceNo CollectionPayment RunningBalance"
    );

    const toDay = (d) => {
      try {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return "";
        return dt.toISOString().slice(0, 10);
      } catch {
        return "";
      }
    };

    const toAmt = (v) => {
      if (v == null) return "0.00";
      if (typeof v === "number") return v.toFixed(2);
      if (typeof v === "string") return (parseFloat(v.replace(/,/g, "")) || 0).toFixed(2);
      if (v && v.constructor && v.constructor.name === "Decimal128") {
        try { return Number(v.toString()).toFixed(2); } catch { return "0.00"; }
      }
      return "0.00";
    };

    const buildKey = (doc) => {
      const ref = (doc.CollectionReferenceNo || "").trim();
      const day = toDay(doc.PaymentDate);
      const amt = toAmt(doc.CollectionPayment);
      const rb = toAmt(doc.RunningBalance);
      return ref
        ? `${loanCycleNo}||REF||${ref}||${day}||${amt}`
        : `${loanCycleNo}||ALT||${day}||${amt}||||${rb}`; // legacy has no CollectorName
    };

    const existingKeys = new Set(existing.map(buildKey));

    const toInsert = [];
    let skipped = 0;
    for (const r of legacy) {
      const candidate = {
        AccountId: loanCycle.AccountId,
        ClientNo: loanCycle.ClientNo,
        LoanCycleNo: loanCycleNo,
        PaymentDate: r.PaymentDate,
        CollectionReferenceNo: r.CollectionReferenceNo,
        CollectionPayment: r.CollectionPayment,
        RunningBalance: r.RunningBalance,
        Penalty: r.Penalty,
        Source: "database-import",
      };
      const k = buildKey(candidate);
      if (existingKeys.has(k)) {
        skipped++;
        continue;
      }
      existingKeys.add(k);
      toInsert.push(candidate);
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const resIns = await LoanCollection.insertMany(toInsert, { ordered: false });
      inserted = Array.isArray(resIns) ? resIns.length : 0;
    }

    return res.json({ success: true, data: { inserted, skipped } });
  } catch (err) {
    console.error("importFromExistingDatabase error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * Import collections from the existing/legacy collection database
 * Expects: { loanCycleNo: string, clientNo?: string }
 * Strategy:
 *  - Find LoanCycle by LoanCycleNo; verify ClientNo if provided
 *  - Read from legacy LoanClientsCollection by LoanNo == loanCycleNo
 *  - Transform and insert into LoanCollection with AccountId/ClientNo from LoanCycle
 *  - Skip duplicates by checking existing (LoanCycleNo + PaymentDate + amount/ref)
 */
// (Removed duplicate implementation)