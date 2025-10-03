import LoanClientApplication from "../models/LoanClientApplication.js";

// Get all FOR REVIEW applications
export const getPendingApplications = async (req, res) => {
  try {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() - 30); // 30 days ago

    // Include both FOR REVIEW and REJECTED (within 30 days)
    const pending = await LoanClientApplication.find({
      $or: [
        { LoanStatus: "FOR REVIEW" },
        { LoanStatus: "REJECTED", RejectedAt: { $gte: threshold } },
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: pending });
  } catch (err) {
    console.error("Error fetching pending applications:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch pending applications",
      });
  }
};

// Approve
export const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await LoanClientApplication.findByIdAndUpdate(
      id,
      { LoanStatus: "APPROVED", ApprovalDate: new Date() },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Approval failed" });
  }
};

// Reject
export const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const updated = await LoanClientApplication.findByIdAndUpdate(
      id,
      {
        LoanStatus: "REJECTED",
        RejectionReason: reason,
        RejectedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Error rejecting application:", err);
    res.status(500).json({ success: false, message: "Rejection failed" });
  }
};

export const reapplyApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await LoanClientApplication.findByIdAndUpdate(
      id,
      {
        ...updates,
        LoanStatus: "FOR REVIEW",
        RejectionReason: null,
        RejectedAt: null,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Error reapplying:", err);
    res.status(500).json({ success: false, message: "Failed to reapply" });
  }
};

