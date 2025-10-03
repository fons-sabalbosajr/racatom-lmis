import express from "express";
import {
  getAllLoanDisbursed,
  getLoanDisbursedByClientNo,
  getLoanDisbursedByAccountId,
  updateLoanDisbursed,
  deleteLoanDisbursed,
} from "../controllers/loanDisbursedController.js";

const router = express.Router();

// GET all (optional)
router.get("/", getAllLoanDisbursed);

// GET by client number
router.get("/client/:clientNo", getLoanDisbursedByClientNo);

// GET by account ID
router.get("/account/:accountId", getLoanDisbursedByAccountId);

// PUT to update a loan disbursed record by ID
router.put("/:id", updateLoanDisbursed);

// DELETE a loan disbursed record by ID
router.delete("/:id", deleteLoanDisbursed);

export default router;
