import express from "express";
import {
  getAccountingTerms,
  createAccountingTerm,
  updateAccountingTerm,
  deleteAccountingTerm,
  seedDefaultTerms,
} from "../controllers/accountingTermController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", getAccountingTerms);
router.post("/", createAccountingTerm);
router.post("/seed-defaults", seedDefaultTerms);
router.put("/:id", updateAccountingTerm);
router.delete("/:id", deleteAccountingTerm);

export default router;
