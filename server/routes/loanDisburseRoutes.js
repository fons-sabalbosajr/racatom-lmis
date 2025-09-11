import express from "express";
import {
  getAllLoanDisbursed,
  getLoanDisbursedByClientNo,
  getLoanDisbursedByAccountId,
} from "../controllers/loanDisbursedController.js";

const router = express.Router();

// GET all (optional)
router.get("/", getAllLoanDisbursed);

// GET by client number
router.get("/client/:clientNo", getLoanDisbursedByClientNo);

// GET by account ID
router.get("/account/:accountId", getLoanDisbursedByAccountId);

export default router;
