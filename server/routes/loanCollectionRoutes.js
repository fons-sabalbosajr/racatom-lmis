import express from "express";
import {
  getCollectionsByLoanCycleNo,
  addCollection,
  updateCollection,
  updateSingleCollection,
  deleteCollection,
  getDistinctPaymentModes,
  getDistinctCollectorNames,
  bulkUpdateCollector,
  dedupeCollections,
} from "../controllers/loanCollectionController.js";

const router = express.Router();

// Order matters: specific routes before dynamic ones
router.get("/payment-modes", getDistinctPaymentModes);
router.get("/collector-names", getDistinctCollectorNames);

router.get("/:loanCycleNo", getCollectionsByLoanCycleNo);
router.post("/", addCollection);
router.put("/:id", updateSingleCollection);
router.delete("/:id", deleteCollection);

// ✅ Bulk update collectors
router.patch("/bulk-update", /* requireAuth, */ bulkUpdateCollector);

// ✅ Deduplicate collections (global or per LoanCycleNo)
router.post("/dedupe", /* requireAuth, */ dedupeCollections);

export default router;
