import express from "express";
import { parseWordFile, parseCsvFile } from "../controllers/parseCollectionController.js";
import requireAuth from "../middleware/requireAuth.js"; // optional

const router = express.Router();

router.post("/word", /* requireAuth, */ parseWordFile);
router.post("/csv", /* requireAuth, */ parseCsvFile);

export default router;
