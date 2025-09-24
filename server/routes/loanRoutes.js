import express from "express";
import {
  getLoans,
  getLoanById,
  updateLoan,
  getLoanStatuses,
  getPaymentModes,
  getLoanYears,
  deleteLoan,
  exportReport, // MODIFIED: Use the new generic exportReport
  getLoansByClientNo,
  getDocumentsByClientNo,
  getLoansByAccountId,
  getLoanTransactions, // NEW
  generateStatementOfAccount, // NEW
  generateLedger, // NEW
} from "../controllers/loanController.js";

const router = express.Router();

// GET /api/loans
router.get("/", getLoans);

// GET loan statuses, payment modes, and years
router.get("/statuses", getLoanStatuses);
router.get("/payment-modes", getPaymentModes);
router.get("/years", getLoanYears);

// GET loans by account id
router.get("/account/:accountId", getLoansByAccountId);

// GET loans by client number
router.get("/client/:clientNo", getLoansByClientNo);

// GET documents by client number
router.get("/client/:clientNo/documents", getDocumentsByClientNo);

// GET loan by ID
router.get("/:id", getLoanById);

// UPDATE loan by ID
router.put("/:id", updateLoan);

// DELETE loan by ID
router.delete("/:id", deleteLoan);

// NEW: Get loan transactions
router.get("/transactions/:accountId/:loanCycleNo", getLoanTransactions);

// NEW: Generate Statement of Account
router.get("/report/statement-of-account/:accountId/:loanCycleNo", generateStatementOfAccount);

// NEW: Generate Ledger
router.get("/report/ledger/:accountId/:loanCycleNo", generateLedger);

// MODIFIED: Export reports (all loans, statement of account, ledger)
router.get("/export/:reportType", exportReport);

export default router;