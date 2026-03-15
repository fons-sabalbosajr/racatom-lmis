import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { developerOnly } from "../middleware/checkPermissions.js";
import { getLogs, getLogFilters, clearLogs } from "../controllers/activityLogController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", developerOnly, getLogs);
router.get("/filters", developerOnly, getLogFilters);
router.post("/clear", developerOnly, clearLogs);

export default router;
