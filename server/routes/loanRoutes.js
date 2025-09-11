import express from "express";
import {
  getLoans,
  getLoanById,
  updateLoan,
  getLoanStatuses,
  getPaymentModes,
  getLoanYears,
  deleteLoan,
  exportLoans,
  getLoansByClientNo,
  getDocumentsByClientNo,
} from "../controllers/loanController.js";

const router = express.Router();

// GET /api/loans
router.get("/", getLoans);

// GET loan statuses, payment modes, and years
router.get("/statuses", getLoanStatuses);
router.get("/payment-modes", getPaymentModes);
router.get("/years", getLoanYears);

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

// EXPORT loans
router.get("/export/all", exportLoans);

export default router;
