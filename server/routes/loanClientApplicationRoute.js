import express from "express";
import {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  reapplyApplication,
} from "../controllers/loanClientApplicationController.js";
import requireAuth from "../middleware/requireAuth.js";
import { checkActionPermission } from "../middleware/checkPermissions.js";

const router = express.Router();

// Protect all application routes
router.use(requireAuth);

router.get("/pending", getPendingApplications);
router.patch("/:id/approve", checkActionPermission("applications", "canEdit"), approveApplication);
router.patch("/:id/reject", checkActionPermission("applications", "canEdit"), rejectApplication);
router.patch("/:id/reapply", checkActionPermission("applications", "canEdit"), reapplyApplication);


export default router;
