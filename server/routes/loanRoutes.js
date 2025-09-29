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
  getLoanDetailsByCycleNo, // NEW
  createLoanApplication, // NEW
  searchClients, // NEW
  getClientDetailsForRenewal, // NEW
  getApprovedClients, // NEW
} from "../controllers/loanController.js";

const router = express.Router();

// GET /api/loans/search-clients
router.get("/search-clients", searchClients);

// GET /api/loans/client-details-for-renewal/:clientNo
router.get("/client-details-for-renewal/:clientNo", getClientDetailsForRenewal);

// GET /api/loans/approved-clients
router.get("/approved-clients", getApprovedClients);

// GET /api/loans
router.get("/", getLoans);

// POST /api/loans/loan_clients_application
router.post("/loan_clients_application", createLoanApplication);

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

// NEW: Get loan details by loanCycleNo
router.get("/details-by-cycle/:loanCycleNo", getLoanDetailsByCycleNo);

export default router;