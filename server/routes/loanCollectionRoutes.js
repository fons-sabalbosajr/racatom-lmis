import express from "express";
import {
  getAllCollections,
  getCollectionsByLoanCycleNo,
  addCollection,
  updateCollection,
  updateSingleCollection,
  deleteCollection,
  getDistinctPaymentModes,
  getDistinctCollectorNames,
  bulkUpdateCollector,
} from "../controllers/loanCollectionController.js";

const router = express.Router();

// Order matters: specific routes before dynamic ones
router.get("/", getAllCollections);
router.get("/payment-modes", getDistinctPaymentModes);
router.get("/collector-names", getDistinctCollectorNames);

router.get("/:loanCycleNo", getCollectionsByLoanCycleNo);
router.post("/", addCollection);
router.put("/:id", updateSingleCollection);
router.delete("/:id", deleteCollection);

// ✅ Bulk update collectors
router.patch("/bulk-update", /* requireAuth, */ bulkUpdateCollector);

export default router;
