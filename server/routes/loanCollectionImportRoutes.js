import express from "express";
import {
  saveParsedCollections,
  commitCollections,
  importFromExistingDatabase,
} from "../controllers/loanCollectionImportController.js";
import requireAuth from "../middleware/requireAuth.js"; // optional

const router = express.Router();

// Save parsed metadata
router.post("/import/:loanNo", /* requireAuth, */ saveParsedCollections);

// Commit to main collection
router.post("/commit/:loanNo", /* requireAuth, */ commitCollections);

// Import from existing collection database
router.post("/import-from-database", /* requireAuth, */ importFromExistingDatabase);

export default router;
