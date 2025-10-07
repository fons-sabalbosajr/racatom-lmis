import LoanCollection from "../models/LoanCollection.js";
import LoanClient from "../models/LoanClient.js";

// Get all collections
export const getAllCollections = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      q: searchQuery = "",
      paymentDate,
      sortBy = "PaymentDate",
      sortDir = "desc",
    } = req.query;

    const limitValue = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitValue;

    let matchStage = {};
    if (paymentDate) {
      const startOfDay = new Date(paymentDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(paymentDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      matchStage.PaymentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (searchQuery) {
      matchStage.$or = [
        { "client.ClientName": { $regex: searchQuery, $options: "i" } },
        { CollectorName: { $regex: searchQuery, $options: "i" } },
        { PaymentMode: { $regex: searchQuery, $options: "i" } },
        { CollectionReferenceNo: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const sortStage = {};
    sortStage[sortBy] = sortDir === "asc" ? 1 : -1;

    const collectionsPipeline = [
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "client",
        },
      },
      {
        $unwind: {
          path: "$client",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchStage },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limitValue },
      {
        $addFields: {
          "client.ClientName": {
            $concat: [
              "$client.FirstName",
              " ",
              { $ifNull: ["$client.MiddleName", ""] },
              " ",
              "$client.LastName",
            ],
          },
        },
      },
    ];

    const collections = await LoanCollection.aggregate(collectionsPipeline);

    const totalPipeline = [
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "client",
        },
      },
      {
        $unwind: {
          path: "$client",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchStage },
      { $count: "total" },
    ];

    const totalResult = await LoanCollection.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    const formattedCollections = collections.map((collection) => {
      const obj = { ...collection };
      for (const key in obj) {
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

    res.status(200).json({
      success: true,
      data: formattedCollections,
      meta: { total, page: parseInt(page), limit: limitValue },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get collections by LoanCycleNo
export const getCollectionsByLoanCycleNo = async (req, res) => {
  try {
    const { loanCycleNo } = req.params;
    if (!loanCycleNo) {
      return res
        .status(400)
        .json({ success: false, message: "Missing LoanCycleNo parameter" });
    }

    const collections = await LoanCollection.find({
      LoanCycleNo: loanCycleNo, // exact match
    }).sort({ PaymentDate: 1 });

    // ✅ FIXED: Deduplicate by creating a composite key of core fields
    const unique = [];
    const seen = new Set();
    for (const item of collections) {
      // Use a consistent date format and key fields to identify logical duplicates
      const paymentDate = new Date(item.PaymentDate)
        .toISOString()
        .split("T")[0];
      const key = `${paymentDate}|${item.CollectionReferenceNo}|${item.CollectionPayment}|${item.RunningBalance}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // ✅ Convert Decimal128 fields on the now-unique collection set
    const formatted = unique.map((collection) => {
      const obj = collection.toObject();
      for (const key in obj) {
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

    res.status(200).json({
      success: true,
      data: formatted,
      meta: { total: formatted.length },
    });
  } catch (error) {
    console.error("❌ getCollectionsByLoanCycleNo:", error);
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

    await LoanCollection.updateMany({ _id: { $in: ids } }, { $set: updates });

    res.json({ success: true, message: "Collections updated successfully" });
  } catch (err) {
    console.error("Bulk update failed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
