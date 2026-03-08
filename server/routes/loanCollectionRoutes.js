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
  dedupeCollections,
} from "../controllers/loanCollectionController.js";
import requireAuth from "../middleware/requireAuth.js";
import { validateFinancialFields } from "../middleware/validateFinancial.js";
import { checkActionPermission } from "../middleware/checkPermissions.js";

const router = express.Router();

// Protect all collection routes
router.use(requireAuth);

// Order matters: specific routes before dynamic ones
router.get("/", getAllCollections);
router.get("/payment-modes", getDistinctPaymentModes);
router.get("/collector-names", getDistinctCollectorNames);

router.get("/:loanCycleNo", getCollectionsByLoanCycleNo);
router.post("/", checkActionPermission("collections", "canCreate"), validateFinancialFields, addCollection);
router.put("/:id", checkActionPermission("collections", "canEdit"), validateFinancialFields, updateSingleCollection);
router.delete("/:id", checkActionPermission("collections", "canDelete"), deleteCollection);

// Bulk update collectors
router.patch("/bulk-update", bulkUpdateCollector);

// Deduplicate collections (global or per LoanCycleNo)
router.post("/dedupe", dedupeCollections);

export default router;
