import express from "express";
import {
  getCollectionsByLoanCycleNo,
  addCollection,
  updateCollection,
  deleteCollection,
  getDistinctPaymentModes,
  getDistinctCollectorNames,
} from "../controllers/loanCollectionController.js";

const router = express.Router();

// Order matters: specific routes before dynamic ones
router.get("/payment-modes", getDistinctPaymentModes);
router.get("/collector-names", getDistinctCollectorNames);

router.get("/:loanCycleNo", getCollectionsByLoanCycleNo);
router.post("/", addCollection);
router.put("/:id", updateCollection);
router.delete("/:id", deleteCollection);

export default router;