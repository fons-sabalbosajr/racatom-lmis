import LoanCollector from "../models/LoanCollector.js";

// GET all collectors (with optional filters)
export const getCollectors = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.EmploymentStatus = status;
    if (search) {
      query.$or = [
        { Name: { $regex: search, $options: "i" } },
        { GeneratedIDNumber: { $regex: search, $options: "i" } },
        { AreaRoutes: { $regex: search, $options: "i" } },
      ];
    }

    const collectors = await LoanCollector.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: collectors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE
export const createCollector = async (req, res) => {
  try {
    const collector = new LoanCollector(req.body);
    await collector.save();
    res.json({ success: true, data: collector });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateCollector = async (req, res) => {
  try {
    const collector = await LoanCollector.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: collector });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteCollector = async (req, res) => {
  try {
    await LoanCollector.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Collector deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
