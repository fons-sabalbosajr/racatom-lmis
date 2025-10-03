import express from "express";
import {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  reapplyApplication,
} from "../controllers/loanClientApplicationController.js";

const router = express.Router();

router.get("/pending", getPendingApplications);
router.patch("/:id/approve", approveApplication);
router.patch("/:id/reject", rejectApplication);
router.patch("/:id/reapply", reapplyApplication);


export default router;
