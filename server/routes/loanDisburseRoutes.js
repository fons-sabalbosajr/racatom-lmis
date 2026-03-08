import express from "express";
import {
  getAllLoanDisbursed,
  getLoanDisbursedByClientNo,
  getLoanDisbursedByAccountId,
  updateLoanDisbursed,
  deleteLoanDisbursed,
} from "../controllers/loanDisbursedController.js";
import requireAuth from "../middleware/requireAuth.js";
import { validateFinancialFields } from "../middleware/validateFinancial.js";
import { checkActionPermission } from "../middleware/checkPermissions.js";

const router = express.Router();

// Protect all disburse routes
router.use(requireAuth);

// GET all (optional)
router.get("/", getAllLoanDisbursed);

// GET by client number
router.get("/client/:clientNo", getLoanDisbursedByClientNo);

// GET by account ID
router.get("/account/:accountId", getLoanDisbursedByAccountId);

// PUT to update a loan disbursed record by ID
router.put("/:id", checkActionPermission("disbursements", "canEdit"), validateFinancialFields, updateLoanDisbursed);

// DELETE a loan disbursed record by ID
router.delete("/:id", checkActionPermission("disbursements", "canDelete"), deleteLoanDisbursed);

export default router;
