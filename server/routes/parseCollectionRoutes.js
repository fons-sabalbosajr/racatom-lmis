import express from "express";
import { parseWordFile, parseCsvFile } from "../controllers/parseCollectionController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.post("/word", requireAuth, parseWordFile);
router.post("/csv", requireAuth, parseCsvFile);

export default router;
