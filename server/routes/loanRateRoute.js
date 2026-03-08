// routes/loanRateRoute.js
import express from "express";
import {
  getLoanRates,
  createLoanRate,
  updateLoanRate,
  deleteLoanRate,
} from "../controllers/loanRateController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// Protect all loan rate routes
router.use(requireAuth);

// CRUD endpoints
router.get("/", getLoanRates);           // GET /api/loan_rates
router.post("/", createLoanRate);        // POST /api/loan_rates
router.put("/:id", updateLoanRate);      // PUT /api/loan_rates/:id
router.delete("/:id", deleteLoanRate);   // DELETE /api/loan_rates/:id

export default router;
