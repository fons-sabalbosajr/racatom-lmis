import LoanCollection from "../models/LoanCollection.js";

// Get collections by LoanCycleNo
export const getCollectionsByLoanCycleNo = async (req, res) => {
  try {
    const { loanCycleNo } = req.params;
    const {
      page = 1,
      limit = 10,
      q: searchQuery = "",
      paymentDate,
    } = req.query;

    const query = { LoanCycleNo: { $regex: loanCycleNo, $options: "i" } };

    if (paymentDate) {
      const startOfDay = new Date(paymentDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(paymentDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.PaymentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (searchQuery) {
      query.$or = [
        { CollectionReferenceNo: { $regex: searchQuery, $options: "i" } },
        { CollectorName: { $regex: searchQuery, $options: "i" } },
        { PaymentMode: { $regex: searchQuery, $options: "i" } },
        // Add other fields here if you want to search them
      ];
    }

    const limitValue = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitValue;

    const collections = await LoanCollection.find(query)
      .sort({ PaymentDate: 1 })
      .skip(skip)
      .limit(limitValue);

    const total = await LoanCollection.countDocuments(query);

    // Convert Decimal128 fields to strings
    const formattedCollections = collections.map((collection) => {
      const obj = collection.toObject(); // Convert Mongoose document to plain JavaScript object
      for (const key in obj) {
        // Check if the value is a Mongoose Decimal128 object
        if (
          obj[key] &&
          typeof obj[key].toString === "function" &&
          obj[key].constructor.name === "Decimal128"
        ) {
          obj[key] = obj[key].toString();
        }
      }
      return obj;
    });

    res.status(200).json({ success: true, data: formattedCollections, meta: { total, page: parseInt(page), limit: limitValue } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new collection
export const addCollection = async (req, res) => {
  try {
    const newCollection = new LoanCollection(req.body);
    await newCollection.save();
    res.status(201).json({ success: true, data: newCollection });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update a collection
export const updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCollection = await LoanCollection.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!updatedCollection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }
    res.status(200).json({ success: true, data: updatedCollection });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a collection
export const deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCollection = await LoanCollection.findByIdAndDelete(id);
    if (!deletedCollection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Collection deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get distinct payment modes
export const getDistinctPaymentModes = async (req, res) => {
  try {
    const paymentModes = await LoanCollection.distinct("PaymentMode");
    res.status(200).json({ success: true, data: paymentModes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get distinct collector names
export const getDistinctCollectorNames = async (req, res) => {
  try {
    const collectorNames = await LoanCollection.distinct("CollectorName");
    res.status(200).json({ success: true, data: collectorNames });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSingleCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // ✅ Validate input
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing collection ID" });
    }

    // ✅ Perform update
    const updated = await LoanCollection.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating collection:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Bulk update collector for multiple collections
 */
export const bulkUpdateCollector = async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });
    }

    await LoanCollection.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );

    res.json({ success: true, message: "Collections updated successfully" });
  } catch (err) {
    console.error("Bulk update failed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};