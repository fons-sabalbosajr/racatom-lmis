import express from "express";
import {
  getLoans,
  getLoanById,
  updateLoan,
  updateLoanCycle,
  getLoanStatuses,
  getPaymentModes,
  getLoanYears,
  deleteLoan,
  exportReport,
  getLoansByClientNo,
  getDocumentsByClientNo,
  getLoansByAccountId,
  getLoanTransactions,
  generateStatementOfAccount,
  generateLedger,
  getLoanDetailsByCycleNo,
  createLoanApplication,
  searchClients,
  getClientDetailsForRenewal,
  getApprovedClients,
  createLoanCycle,
  exportLoansExcel,
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

// POST /api/loans/cycles  <-- CORRECTED ROUTE
router.post("/cycles", createLoanCycle);

// GET loan statuses, payment modes, and years
router.get("/statuses", getLoanStatuses);
router.get("/payment-modes", getPaymentModes);
router.get("/years", getLoanYears);

// ✅ FIX: Export routes are moved here, BEFORE parameterized routes like '/:id'
router.get("/export", exportLoansExcel);
router.get("/export/:reportType", exportReport);

// GET loans by account id
router.get("/account/:accountId", getLoansByAccountId);

// GET loans by client number
router.get("/client/:clientNo", getLoansByClientNo);

// GET documents by client number
router.get("/client/:clientNo/documents", getDocumentsByClientNo);

// NEW: Get loan details by loanCycleNo
router.get("/details-by-cycle/:loanCycleNo", getLoanDetailsByCycleNo);

// GET loan by ID (must be after other specific GET routes)
router.get("/:id", getLoanById);

// UPDATE loan by ID
router.put("/:id", updateLoan);

// UPDATE loan cycle by ID
router.put("/cycle/:id", updateLoanCycle);

// DELETE loan by ID
router.delete("/:id", deleteLoan);

// NEW: Get loan transactions
router.get("/transactions/:accountId/:loanCycleNo", getLoanTransactions);

// NEW: Generate Statement of Account
router.get(
  "/report/statement-of-account/:accountId/:loanCycleNo",
  generateStatementOfAccount
);

// NEW: Generate Ledger
router.get("/report/ledger/:accountId/:loanCycleNo", generateLedger);

export default router;
