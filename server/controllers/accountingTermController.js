import AccountingTerm from "../models/AccountingTerm.js";

// GET /api/accounting-terms
export const getAccountingTerms = async (req, res) => {
  try {
    const { category, active } = req.query;
    const query = {};
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === "true";

    const terms = await AccountingTerm.find(query).sort({ category: 1, sortOrder: 1, name: 1 }).lean();
    res.json({ success: true, data: terms });
  } catch (err) {
    console.error("getAccountingTerms error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/accounting-terms
export const createAccountingTerm = async (req, res) => {
  try {
    const { code, name, description, category, sortOrder } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: "Code and name are required" });
    }

    const existing = await AccountingTerm.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A term with this code already exists" });
    }

    const term = await AccountingTerm.create({
      code: code.toUpperCase(),
      name,
      description: description || "",
      category: category || "Other",
      sortOrder: sortOrder || 0,
    });
    res.status(201).json({ success: true, data: term });
  } catch (err) {
    console.error("createAccountingTerm error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/accounting-terms/:id
export const updateAccountingTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, category, isActive, sortOrder } = req.body;

    const updates = {};
    if (code !== undefined) updates.code = code.toUpperCase();
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    // Check uniqueness if code is being updated
    if (updates.code) {
      const dup = await AccountingTerm.findOne({ code: updates.code, _id: { $ne: id } });
      if (dup) {
        return res.status(409).json({ success: false, message: "A term with this code already exists" });
      }
    }

    const term = await AccountingTerm.findByIdAndUpdate(id, updates, { new: true });
    if (!term) {
      return res.status(404).json({ success: false, message: "Term not found" });
    }
    res.json({ success: true, data: term });
  } catch (err) {
    console.error("updateAccountingTerm error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/accounting-terms/:id
export const deleteAccountingTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await AccountingTerm.findByIdAndDelete(id);
    if (!term) {
      return res.status(404).json({ success: false, message: "Term not found" });
    }
    res.json({ success: true, message: "Term deleted" });
  } catch (err) {
    console.error("deleteAccountingTerm error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/accounting-terms/seed-defaults
export const seedDefaultTerms = async (req, res) => {
  try {
    const defaults = [
      { code: "INT-INC", name: "Interest Income", category: "Income", description: "Revenue from loan interest payments", sortOrder: 1 },
      { code: "PEN-INC", name: "Penalty Income", category: "Income", description: "Revenue from loan penalties", sortOrder: 2 },
      { code: "SVC-INC", name: "Service Fee Income", category: "Income", description: "Revenue from service charges", sortOrder: 3 },
      { code: "LN-REC", name: "Loans Receivable", category: "Asset", description: "Outstanding loan principal owed by clients", sortOrder: 1 },
      { code: "INT-REC", name: "Interest Receivable", category: "Asset", description: "Accrued interest yet to be collected", sortOrder: 2 },
      { code: "CSH", name: "Cash on Hand", category: "Asset", description: "Physical cash available", sortOrder: 3 },
      { code: "LN-PAY", name: "Loans Payable", category: "Liability", description: "Borrowed funds to be repaid", sortOrder: 1 },
      { code: "SAL-EXP", name: "Salaries Expense", category: "Expense", description: "Employee salary expenses", sortOrder: 1 },
      { code: "OFC-EXP", name: "Office Expense", category: "Expense", description: "Office supplies and utilities", sortOrder: 2 },
      { code: "OPR-EXP", name: "Operating Expense", category: "Expense", description: "General operational costs", sortOrder: 3 },
      { code: "CAP", name: "Owner's Capital", category: "Equity", description: "Owner's equity contribution", sortOrder: 1 },
      { code: "RET-EARN", name: "Retained Earnings", category: "Equity", description: "Accumulated net income", sortOrder: 2 },
    ];

    let inserted = 0;
    let skipped = 0;
    for (const d of defaults) {
      const exists = await AccountingTerm.findOne({ code: d.code });
      if (exists) {
        skipped++;
        continue;
      }
      await AccountingTerm.create(d);
      inserted++;
    }

    res.json({ success: true, data: { inserted, skipped } });
  } catch (err) {
    console.error("seedDefaultTerms error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
