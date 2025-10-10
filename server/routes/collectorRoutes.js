import express from "express";
import {
  getCollectors,
  createCollector,
  updateCollector,
  deleteCollector,
} from "../controllers/collectorController.js";
import {
  listCollectorDocuments,
  uploadCollectorDocuments,
  createCollectorLink,
  deleteCollectorDocument,
} from "../controllers/collectorDocumentController.js";
import requireAuth from "../middleware/requireAuth.js";
import uploadLoanDocument from "../middleware/uploadLoanDocument.js";

const router = express.Router();

router.get("/", requireAuth, getCollectors);
router.post("/", requireAuth, createCollector);
router.put("/:id", requireAuth, updateCollector);
router.delete("/:id", requireAuth, deleteCollector);

// Collector documents
router.get("/:id/documents", requireAuth, listCollectorDocuments);
router.post(
  "/:id/documents/upload",
  requireAuth,
  uploadLoanDocument, // parses multipart and places files in OS temp
  uploadCollectorDocuments
);
router.post("/:id/documents/link", requireAuth, createCollectorLink);
router.delete("/documents/:docId", requireAuth, deleteCollectorDocument);

export default router;
