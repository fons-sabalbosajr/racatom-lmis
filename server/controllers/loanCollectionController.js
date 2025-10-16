import LoanCollection from "../models/LoanCollection.js";

// Get all collections with optional filters/pagination
export const getAllCollections = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      q: searchQuery = "",
      paymentDate,
      startDate,
      endDate,
  loanCycleNo,
      accountId,
  clientNo,
      collectorName,
      paymentMode,
      sortBy = "PaymentDate",
      sortDir = "asc",
      minimal = "0",
      summary = "0",
    } = req.query;

    const minimalMode = String(minimal).toLowerCase() === "1" || String(minimal).toLowerCase() === "true";
    const summaryMode = String(summary).toLowerCase() === "1" || String(summary).toLowerCase() === "true";
    const query = {};

    // Optional simple equality filters
    const useRegex = (val) => typeof val === "string" && /[.*+?^${}()|[\]\\]/.test(val);
    if (loanCycleNo) {
      query.LoanCycleNo = useRegex(loanCycleNo)
        ? { $regex: loanCycleNo, $options: "i" }
        : loanCycleNo;
    }
    if (accountId) {
      query.AccountId = useRegex(accountId)
        ? { $regex: accountId, $options: "i" }
        : accountId;
    }
    if (clientNo) {
      query.ClientNo = useRegex(clientNo)
        ? { $regex: clientNo, $options: "i" }
        : clientNo;
    }
    if (collectorName) {
      query.CollectorName = { $regex: collectorName, $options: "i" };
    }
    if (paymentMode) {
      query.PaymentMode = { $regex: paymentMode, $options: "i" };
    }

    // Date filters: either specific day (paymentDate) or range (startDate/endDate)
    if (paymentDate) {
      const startOfDay = new Date(paymentDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(paymentDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.PaymentDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate || endDate) {
      const sd = startDate ? new Date(startDate) : null;
      const ed = endDate ? new Date(endDate) : null;
      if (sd) sd.setUTCHours(0, 0, 0, 0);
      if (ed) ed.setUTCHours(23, 59, 59, 999);
      query.PaymentDate = {
        ...(sd ? { $gte: sd } : {}),
        ...(ed ? { $lte: ed } : {}),
      };
    }

    // Text search across common fields
    if (searchQuery) {
      const rx = { $regex: searchQuery, $options: "i" };
      query.$or = [
        { AccountId: rx },
        { ClientNo: rx },
        { LoanCycleNo: rx },
        { CollectorName: rx },
        { PaymentMode: rx },
        { CollectionReferenceNo: rx },
        { Bank: rx },
        { Branch: rx },
      ];
    }

    const limitValue = parseInt(limit);
    const pageValue = parseInt(page);
    const skip = (pageValue - 1) * limitValue;

    // If requesting summary only, run a lean aggregation and return early
    if (summaryMode) {
      try {
        const matchStage = { ...query };
        const pipeline = [
          { $match: matchStage },
          { $sort: { PaymentDate: 1, _id: 1 } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              firstDate: { $first: "$PaymentDate" },
              lastDate: { $last: "$PaymentDate" },
              totalCollected: {
                $sum: {
                  $cond: [
                    { $ifNull: ["$CollectionPayment", false] },
                    { $toDouble: { $ifNull: ["$CollectionPayment", 0] } },
                    { $toDouble: { $ifNull: ["$TotalCollected", 0] } },
                  ],
                },
              },
              lastRunningBalance: { $last: "$RunningBalance" },
            },
          },
        ];

        const result = await LoanCollection.aggregate(pipeline);
        const s = Array.isArray(result) && result.length > 0 ? result[0] : {};
        const toNum = (v) => {
          if (v == null) return 0;
          if (typeof v === "number") return v;
          if (typeof v === "string") return Number(v.replace(/,/g, "")) || 0;
          if (v && v.constructor && v.constructor.name === "Decimal128") {
            try { return Number(v.toString()); } catch { return 0; }
          }
          return 0;
        };

        const summaryPayload = {
          count: s.count || 0,
          firstDate: s.firstDate || null,
          lastDate: s.lastDate || null,
          totalCollection: toNum(s.totalCollected || 0),
          lastRunningBalance: toNum(s.lastRunningBalance || 0),
        };

        return res.status(200).json({
          success: true,
          data: [],
          meta: { total: summaryPayload.count, page: 1, limit: 0 },
          summary: summaryPayload,
        });
      } catch (e) {
        console.error("Error summarizing collections:", e);
        return res
          .status(500)
          .json({ success: false, message: e.message || "Summary error" });
      }
    }

    // Build aggregation pipeline; optionally include client name when not in minimal mode
    const matchStage = { ...query };
    const pipeline = [
      { $match: matchStage },
    ];

    if (!minimalMode) {
      pipeline.push(
        {
          $lookup: {
            from: "loan_clients",
            localField: "ClientNo",
            foreignField: "ClientNo",
            as: "clientInfo",
          },
        },
        { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            "client.ClientName": {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$clientInfo.FirstName", ""] },
                    " ",
                    { $ifNull: ["$clientInfo.MiddleName", ""] },
                    " ",
                    { $ifNull: ["$clientInfo.LastName", ""] },
                  ],
                },
              },
            },
            clientName: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$clientInfo.FirstName", ""] },
                    " ",
                    { $ifNull: ["$clientInfo.MiddleName", ""] },
                    " ",
                    { $ifNull: ["$clientInfo.LastName", ""] },
                  ],
                },
              },
            },
          },
        }
      );
    } else {
      // In minimal mode, project to essential fields only to reduce payload
      pipeline.push({
        $project: {
          _id: 1,
          LoanCycleNo: 1,
          AccountId: 1,
          ClientNo: 1,
          PaymentDate: 1,
          CollectionPayment: 1,
          TotalCollected: 1,
          RunningBalance: 1,
          CollectionReferenceNo: 1,
          PaymentMode: 1,
          CollectorName: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      });
  }

    // Sorting
    const sortField = typeof sortBy === "string" && sortBy.length > 0 ? sortBy : "PaymentDate";
    const sortOrder = sortDir === "desc" ? -1 : 1;
  pipeline.push({ $sort: { [sortField]: sortOrder, _id: 1 } });

    // Pagination
    if (limitValue !== 0) {
      pipeline.push({ $skip: skip }, { $limit: limitValue });
    }

    const [collections, totalAgg] = await Promise.all([
      LoanCollection.aggregate(pipeline),
      LoanCollection.countDocuments(matchStage),
    ]);

    // Convert Decimal128 fields to strings for JSON safety
    const toPlain = (obj) => {
      if (obj instanceof Date) return obj.toISOString();
      if (!obj || typeof obj !== "object") return obj;
      // Avoid destructuring Date (would turn into empty object)
      const out = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        const v = obj[key];
        if (v && v.constructor && v.constructor.name === "Decimal128") {
          out[key] = typeof v.toString === "function" ? v.toString() : String(v);
        } else if (v instanceof Date) {
          out[key] = v.toISOString();
        } else if (v && typeof v === "object") {
          out[key] = toPlain(v);
        } else {
          out[key] = v;
        }
      }
      return out;
    };

    const formatted = collections.map((doc) => toPlain({ ...doc }));

    res.status(200).json({
      success: true,
      data: formatted,
      meta: { total: totalAgg, page: pageValue, limit: limitValue },
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

/**
 * Deduplicate loan collections either globally or scoped to a specific LoanCycleNo.
 * Strategy:
 *  - If CollectionReferenceNo exists, group by (LoanCycleNo, refNo, PaymentDate(day), Amount)
 *  - Otherwise, group by (LoanCycleNo, PaymentDate(day), Amount, CollectorName, RunningBalance)
 *  - Keep the newest by createdAt; delete older ones.
 * Accepts: { loanCycleNo?: string, dryRun?: boolean }
 */
export const dedupeCollections = async (req, res) => {
  try {
    const { loanCycleNo, dryRun = false } = req.body || {};

    const matchStage = {};
    if (loanCycleNo) {
      matchStage.LoanCycleNo = loanCycleNo;
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } }, // newest first so first id is kept
      {
        $project: {
          _id: 1,
          createdAt: 1,
          LoanCycleNo: 1,
          PaymentDate: 1,
          CollectorName: 1,
          CollectionReferenceNo: {
            $trim: { input: { $ifNull: ["$CollectionReferenceNo", ""] } },
          },
          amountStr: { $toString: { $ifNull: ["$CollectionPayment", 0] } },
          runBalStr: { $toString: { $ifNull: ["$RunningBalance", 0] } },
          dateDay: {
            $cond: [
              { $ifNull: ["$PaymentDate", false] },
              { $dateToString: { format: "%Y-%m-%d", date: "$PaymentDate" } },
              "",
            ],
          },
        },
      },
      {
        $addFields: {
          hasRef: { $gt: [{ $strLenCP: "$CollectionReferenceNo" }, 0] },
        },
      },
      {
        $addFields: {
          primaryKey: {
            $cond: [
              "$hasRef",
              {
                $concat: [
                  "$LoanCycleNo",
                  "||REF||",
                  "$CollectionReferenceNo",
                  "||",
                  "$dateDay",
                  "||",
                  "$amountStr",
                ],
              },
              {
                $concat: [
                  "$LoanCycleNo",
                  "||ALT||",
                  "$dateDay",
                  "||",
                  "$amountStr",
                  "||",
                  { $ifNull: ["$CollectorName", ""] },
                  "||",
                  "$runBalStr",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$primaryKey",
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ];

    const agg = await LoanCollection.aggregate(pipeline);
    // Build list of ids to delete (keep newest which is index 0 due to sort)
    const toDelete = [];
    agg.forEach((g) => {
      if (Array.isArray(g.ids) && g.ids.length > 1) {
        toDelete.push(...g.ids.slice(1));
      }
    });

    if (dryRun) {
      return res.json({
        success: true,
        scope: loanCycleNo || "global",
        duplicatesGroups: agg.length,
        toDeleteCount: toDelete.length,
        sampleGroup: agg[0] || null,
      });
    }

    if (toDelete.length === 0) {
      return res.json({
        success: true,
        scope: loanCycleNo || "global",
        message: "No duplicates found",
        deleted: 0,
      });
    }

    const delRes = await LoanCollection.deleteMany({ _id: { $in: toDelete } });
    return res.json({
      success: true,
      scope: loanCycleNo || "global",
      deleted: delRes.deletedCount || 0,
    });
  } catch (err) {
    console.error("Dedupe failed:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};