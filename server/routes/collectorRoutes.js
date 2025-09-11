import express from "express";
import {
  getCollectors,
  createCollector,
  updateCollector,
  deleteCollector,
} from "../controllers/collectorController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/", requireAuth, getCollectors);
router.post("/", requireAuth, createCollector);
router.put("/:id", requireAuth, updateCollector);
router.delete("/:id", requireAuth, deleteCollector);

export default router;
