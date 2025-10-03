import express from "express";
import { parseWordFile } from "../controllers/parseCollectionController.js";
import requireAuth from "../middleware/requireAuth.js"; // optional

const router = express.Router();

router.post("/word", /* requireAuth, */ parseWordFile);

export default router;
