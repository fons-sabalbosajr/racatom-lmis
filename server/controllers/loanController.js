import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import LoanClient from "../models/LoanClient.js";
import LoanCycle from "../models/LoanCycle.js";
import LoanCollection from "../models/LoanCollection.js"; // New import
import LoanDocument from "../models/LoanDocument.js";
import ExcelJS from "exceljs";
import LoanClientApplication from "../models/LoanClientApplication.js";

// Merge / reshape function
const transformLoan = (doc) => {
  const loan = doc;
  // Provide resilient fallbacks for name components
  const firstNameFallback =
    loan.FirstName || loan.firstName || loan.person?.firstName || "";
  const middleNameFallback =
    loan.MiddleName || loan.middleName || loan.person?.middleName || "";
  const lastNameFallback =
    loan.LastName || loan.lastName || loan.person?.lastName || "";

  const fullName = [firstNameFallback, middleNameFallback, lastNameFallback]
    .filter((p) => p && String(p).trim().length > 0)
    .join(" ");

  return {
    _id: loan._id,
    fullName,
    clientNo: loan.ClientNo,
    accountId: loan.AccountId,
    collectionCount: loan.collectionCount, // Include collection count
    person: {
      firstName: firstNameFallback,
      middleName: middleNameFallback,
      lastName: lastNameFallback,
      birthAddress: loan.BirthAddress,
      civilStatus: loan.CivilStatus,
      dateOfBirth: loan.DateOfBirth,
      gender: loan.Gender,
      monthlyIncome: loan.MonthlyIncome,
      numberOfChildren: loan.NumberOfChildren,
      occupation: loan.Occupation,
      companyName: loan.CompanyName,
      workAddress: loan.WorkAddress,
      // Duplicated / denormalized fields for existing frontend (LoanPersonalInfoTab)
      // These originally lived under separate objects `contact` & `spouse` but the
      // UI expects them inside `person.*` resulting in N/A displays.
      contactNo: loan.ContactNumber,
      alternateContactNo: loan.AlternateContactNumber,
      email: loan.Email,
      spouseFirstName: loan.Spouse ? loan.Spouse.FirstName : "",
      spouseMiddleName: loan.Spouse ? loan.Spouse.MiddleName : "",
      spouseLastName: loan.Spouse ? loan.Spouse.LastName : "",
    },
    loanInfo: {
      loanNo: loan.LoanCycleNo,
      type: loan.LoanType,
      status: loan.LoanStatus || "Unknown",
      processStatus: loan.LoanProcessStatus,
      term: loan.LoanTerm,
      amount: Number(String(loan.LoanAmount || 0).replace(/[₱,]/g, "")),
      principal: Number(String(loan.PrincipalAmount || 0).replace(/[₱,]/g, "")),
      balance: Number(String(loan.LoanBalance || 0).replace(/[₱,]/g, "")),
      penalty: Number(String(loan.Penalty || 0).replace(/[₱,]/g, "")),
      interest: Number(String(loan.LoanInterest || 0).replace(/[₱,]/g, "")),
      paymentMode: loan.PaymentMode,
      startPaymentDate: loan.StartPaymentDate,
      maturityDate: loan.MaturityDate,
      collectorName: loan.CollectorName,
      remarks: loan.Remarks,
    },
    Date_Encoded: loan.Date_Encoded,
    Date_Modified: loan.Date_Modified,
    address: {
      barangay: loan.Barangay,
      city: loan.City,
      province: loan.Province,
    },
    contact: {
      contactNumber: loan.ContactNumber,
      alternateContactNumber: loan.AlternateContactNumber,
      email: loan.Email,
    },
    spouse: {
      firstName: loan.Spouse ? loan.Spouse.FirstName : "",
      middleName: loan.Spouse ? loan.Spouse.MiddleName : "",
      lastName: loan.Spouse ? loan.Spouse.LastName : "",
    },
    timestamps: {
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    },
  };
};

// Internal helper to get Statement of Account data
const _getStatementOfAccountData = async (
  accountId,
  loanCycleNo,
  startDate,
  endDate
) => {
  // Fetch loan details
  const loanPipeline = [
    { $match: { AccountId: accountId, LoanCycleNo: loanCycleNo } },
    {
      $lookup: {
        from: "loan_clients",
        localField: "ClientNo",
        foreignField: "ClientNo",
        as: "clientInfo",
      },
    },
    { $unwind: "$clientInfo" },
    {
      $project: {
        _id: "$_id",
        AccountId: "$AccountId",
        ClientNo: "$ClientNo",
        LoanCycleNo: "$LoanCycleNo",
        LoanType: "$LoanType",
        LoanStatus: "$LoanStatus",
        LoanAmount: "$LoanAmount",
        PrincipalAmount: "$PrincipalAmount",
        LoanBalance: "$LoanBalance",
        LoanInterest: "$LoanInterest",
        Penalty: "$Penalty",
        StartPaymentDate: "$StartPaymentDate",
        MaturityDate: "$MaturityDate",
        FirstName: "$clientInfo.FirstName",
        MiddleName: "$clientInfo.MiddleName",
        LastName: "$clientInfo.LastName",
        ContactNumber: "$clientInfo.ContactNumber",
        Barangay: "$clientInfo.Barangay",
        City: "$clientInfo.City",
        Province: "$clientInfo.Province",
      },
    },
  ];
  const loanDetails = await LoanCycle.aggregate(loanPipeline);

  if (!loanDetails || loanDetails.length === 0) {
    throw new Error("Loan not found.");
  }
  const loan = loanDetails[0];

  // Fetch transactions
  const transactionMatchQuery = {
    AccountId: accountId,
    LoanCycleNo: loanCycleNo,
  };
  if (startDate && endDate) {
    transactionMatchQuery.PaymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }
  const transactions = await LoanCollection.find(transactionMatchQuery).sort({
    PaymentDate: 1,
  });

  // Format data for Statement of Account
  const statementData = {
    loanInfo: {
      accountId: loan.AccountId,
      loanCycleNo: loan.LoanCycleNo,
      clientName: `${loan.FirstName} ${loan.MiddleName || ""} ${loan.LastName}`,
      loanType: loan.LoanType,
      loanAmount: loan.LoanAmount,
      principalAmount: loan.PrincipalAmount,
      loanInterest: loan.LoanInterest,
      penalty: loan.Penalty,
      startPaymentDate: loan.StartPaymentDate,
      maturityDate: loan.MaturityDate,
      currentBalance: loan.LoanBalance, // Current balance from LoanCycle
    },
    transactions: transactions.map((t) => ({
      paymentDate: t.PaymentDate,
      description: "Payment", // Can be more detailed if transaction types exist
      principalPaid: t.PrincipalPaid,
      interestPaid: t.InterestPaid,
      penaltyPaid: t.Penalty, // Assuming Penalty in LoanCollection is penalty paid
      totalCollected: t.TotalCollected,
      runningBalance: t.RunningBalance, // Running balance after this transaction
    })),
  };
  return statementData;
};

// Internal helper to get Ledger data
const _getLedgerData = async (accountId, loanCycleNo, startDate, endDate) => {
  // Fetch loan details
  const loanPipeline = [
    { $match: { AccountId: accountId, LoanCycleNo: loanCycleNo } },
    {
      $lookup: {
        from: "loan_clients",
        localField: "ClientNo",
        foreignField: "ClientNo",
        as: "clientInfo",
      },
    },
    { $unwind: "$clientInfo" },
    {
      $project: {
        _id: "$_id",
        AccountId: "$AccountId",
        ClientNo: "$ClientNo",
        LoanCycleNo: "$LoanCycleNo",
        LoanType: "$LoanType",
        LoanStatus: "$LoanStatus",
        LoanAmount: "$LoanAmount",
        PrincipalAmount: "$PrincipalAmount",
        LoanBalance: "$LoanBalance",
        LoanInterest: "$LoanInterest",
        Penalty: "$Penalty",
        StartPaymentDate: "$StartPaymentDate",
        MaturityDate: "$MaturityDate",
        FirstName: "$clientInfo.FirstName",
        MiddleName: "$clientInfo.MiddleName",
        LastName: "$clientInfo.LastName",
        ContactNumber: "$clientInfo.ContactNumber",
        Barangay: "$clientInfo.Barangay",
        City: "$clientInfo.City",
        Province: "$clientInfo.Province",
      },
    },
  ];
  const loanDetails = await LoanCycle.aggregate(loanPipeline);

  if (!loanDetails || loanDetails.length === 0) {
    throw new Error("Loan not found.");
  }
  const loan = loanDetails[0];

  // Fetch transactions
  const transactionMatchQuery = {
    AccountId: accountId,
    LoanCycleNo: loanCycleNo,
  };
  if (startDate && endDate) {
    transactionMatchQuery.PaymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }
  const transactions = await LoanCollection.find(transactionMatchQuery).sort({
    PaymentDate: 1,
  });

  // Format data for Ledger
  const ledgerData = {
    loanInfo: {
      accountId: loan.AccountId,
      loanCycleNo: loan.LoanCycleNo,
      clientName: `${loan.FirstName} ${loan.MiddleName || ""} ${loan.LastName}`,
      loanType: loan.LoanType,
      loanAmount: loan.LoanAmount,
      principalAmount: loan.PrincipalAmount,
      loanInterest: loan.LoanInterest,
      penalty: loan.Penalty,
      startPaymentDate: loan.StartPaymentDate,
      maturityDate: loan.MaturityDate,
      currentBalance: loan.LoanBalance, // Current balance from LoanCycle
    },
    entries: transactions.map((t) => ({
      date: t.PaymentDate,
      description: "Payment", // Can be more detailed
      debit: t.TotalCollected, // Assuming total collected is a debit to the loan balance
      credit: 0, // No direct credit in this context unless it's an adjustment
      runningBalance: t.RunningBalance,
    })),
  };
  return ledgerData;
};

export const createLoanCycle = async (req, res) => {
  try {
    const { LoanNo, ...restOfBody } = req.body;

    // Check if a loan with this LoanCycleNo already exists
    const existingLoan = await LoanCycle.findOne({ LoanCycleNo: LoanNo });
    if (existingLoan) {
      return res.status(400).json({
        success: false,
        message: `A loan with Loan No '${LoanNo}' already exists.`,
      });
    }

    // Create the new loan cycle object
    const newLoanCycleData = {
      ...restOfBody,
      LoanCycleNo: LoanNo, // Map frontend's LoanNo to the model's LoanCycleNo
    };

    const loanCycle = new LoanCycle(newLoanCycleData);
    await loanCycle.save();

    res.status(201).json({ success: true, data: loanCycle });
  } catch (err) {
    console.error("Error creating loan cycle:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({
      success: false,
      message: "Server error while creating loan cycle.",
    });
  }
};

export const getLoans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      q = "",
      loanStatus,
      paymentMode,
      year,
      needsUpdate = false,
      sortBy = "AccountId",
      sortDir = "asc",
      collectorName,
      minimal,
      upcoming,
    } = req.query;

    const matchQuery = {};

    // 🔍 Filters
    if (loanStatus) matchQuery.LoanStatus = loanStatus;
    if (paymentMode) matchQuery.PaymentMode = paymentMode;
    if (year) matchQuery.AccountId = { $regex: `^RCT-${year}`, $options: "i" };
    if (needsUpdate === "true") {
      matchQuery.LoanCycleNo = { $regex: "-R", $options: "i" };
    }

    // Filter by collector names (can be array or comma-separated string)
    if (collectorName) {
      let names = [];
      if (Array.isArray(collectorName)) names = collectorName;
      else if (typeof collectorName === "string") names = collectorName.split(",");
      names = names.map((n) => String(n).trim()).filter(Boolean);
      if (names.length > 0) {
        matchQuery.CollectorName = { $in: names };
      }
    }

    // Upcoming payments: active loans with positive balance
    if (upcoming === "true") {
      matchQuery.LoanStatus = { ...(matchQuery.LoanStatus || {}), $ne: "CLOSED" };
      matchQuery.LoanBalance = { $gt: 0 };
    }

    // ✅ MODIFIED: Expanded search to include client's name from the joined collection.
    if (q) {
      const regex = new RegExp(q, "i");
      matchQuery.$or = [
        // Fields from LoanCycle collection
        { AccountId: regex },
        { ClientNo: regex },
        { LoanCycleNo: regex },
        { CollectorName: regex },
        // Fields from the joined 'loan_clients' collection
        { "clientInfo.FirstName": regex },
        { "clientInfo.MiddleName": regex },
        { "clientInfo.LastName": regex },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const sortOrder = sortDir === "desc" ? -1 : 1;

    // ✅ MODIFIED: The pipeline now joins first, then applies the comprehensive match query.
    const pipeline = [
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "clientInfo",
        },
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },

      { $match: matchQuery },

      {
        $lookup: {
          from: "loan_collections",
          localField: "LoanCycleNo",
          foreignField: "LoanCycleNo",
          as: "collections",
        },
      },

      {
        $addFields: {
          collectionCount: { $size: "$collections" },
          latestCollectionUpdate: { $max: "$collections.updatedAt" },
          "person.firstName": "$clientInfo.FirstName",
          "person.middleName": "$clientInfo.MiddleName",
          "person.lastName": "$clientInfo.LastName",
          "person.gender": "$clientInfo.Gender",
          "person.civilStatus": "$clientInfo.CivilStatus",
          "person.birthAddress": "$clientInfo.BirthAddress",
          "person.dateOfBirth": "$clientInfo.DateOfBirth",
          "person.monthlyIncome": "$clientInfo.MonthlyIncome",
          "person.numberOfChildren": "$clientInfo.NumberOfChildren",
          "person.occupation": "$clientInfo.Occupation",
          "person.companyName": "$clientInfo.CompanyName",
          "person.workAddress": "$clientInfo.WorkAddress",

          "contact.contactNumber": "$clientInfo.ContactNumber",
          "contact.alternateContactNumber": "$clientInfo.AlternateContactNumber",
          "contact.email": "$clientInfo.Email",

          "spouse.firstName": { $ifNull: ["$clientInfo.Spouse.FirstName", ""] },
          "spouse.middleName": { $ifNull: ["$clientInfo.Spouse.MiddleName", ""] },
          "spouse.lastName": { $ifNull: ["$clientInfo.Spouse.LastName", ""] },

          // Add fullName so frontend always has a consistent field
          fullName: {
            $trim: {
              input: {
                $concat: [
                  "$clientInfo.FirstName",
                  " ",
                  { $ifNull: ["$clientInfo.MiddleName", ""] },
                  " ",
                  "$clientInfo.LastName",
                ],
              },
            },
          },

          "address.barangay": "$clientInfo.Barangay",
          "address.city": "$clientInfo.City",
          "address.province": "$clientInfo.Province",
        },
      },

      minimal
        ? {
            $project: {
              _id: 1,
              AccountId: 1,
              ClientNo: 1,
              LoanCycleNo: 1,
              LoanType: 1,
              LoanStatus: 1,
              LoanProcessStatus: 1,
              LoanAmount: 1,
              LoanBalance: 1,
              PaymentMode: 1,
              CollectorName: 1,
              StartPaymentDate: 1,
              MaturityDate: 1,
              fullName: 1,
              collectionCount: 1,
              latestCollectionUpdate: 1,
              // ensure location data is available in minimal mode
              address: 1,
            },
          }
        : {
            $project: {
              _id: 1,
              AccountId: 1,
              ClientNo: 1,
              LoanCycleNo: 1,
              LoanType: 1,
              LoanStatus: 1,
              LoanProcessStatus: 1,
              LoanTerm: 1,
              LoanAmount: 1,
              PrincipalAmount: 1,
              LoanBalance: 1,
              LoanInterest: 1,
              Penalty: 1,
              PaymentMode: 1,
              CollectorName: 1,
              StartPaymentDate: 1,
              MaturityDate: 1,
              createdAt: 1,
              updatedAt: 1,
              person: 1,
              address: 1,
              contact: 1,
              spouse: 1,
              fullName: 1,
              collectionCount: 1,
              latestCollectionUpdate: 1,
            },
          },

      // keep existing sort-by behavior from request query
      { $sort: { [sortBy]: sortOrder, ClientNo: sortOrder } },

      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ];

    // The total count needs to be calculated on the filtered data.
    // We create a separate pipeline for counting that stops before pagination.
    const countPipeline = [
      ...pipeline.slice(0, -2), // Remove $skip and $limit
      { $count: "total" },
    ];

    // Execute both pipelines
    const [data, totalResult] = await Promise.all([
      LoanCycle.aggregate(pipeline).collation({
        locale: "en",
        numericOrdering: true,
      }),
      LoanCycle.aggregate(countPipeline),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // ✅ Transform for frontend
    const loans = data.map((loan) => {
      let collectionStatus = "No Data Encoded";
      if (loan.collectionCount > 0 && loan.latestCollectionUpdate) {
        const diffDays =
          (Date.now() - new Date(loan.latestCollectionUpdate)) /
          (1000 * 60 * 60 * 24);
        collectionStatus = diffDays > 30 ? "Outdated" : "Updated";
      }

      const loanInfo = {
        loanNo: loan.LoanCycleNo,
        clientNo: loan.ClientNo,
        status: loan.LoanStatus,
        processStatus: loan.LoanProcessStatus || "N/A",
        amount: loan.LoanAmount || 0,
        balance: loan.LoanBalance || 0,
        paymentMode: loan.PaymentMode || "N/A",
        type: loan.LoanType || "N/A",
        collectorName: loan.CollectorName || "N/A",
        // <-- include the maturity date (and start date if you want)
        startPaymentDate: loan.StartPaymentDate || null,
        maturityDate: loan.MaturityDate || null,
      };

      return {
        ...loan,
        accountId: loan.AccountId,
        loanInfo,
        collectionStatus,
      };
    });

    res.json({
      success: true,
      data: loans,
      meta: { page: pageNum, limit: limitNum, total },
    });
  } catch (err) {
    console.error("❌ Error in getLoans:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET loan by id
export const getLoanById = async (req, res) => {
  try {
    const loanId = req.params.id;
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(loanId) } }, // Match by LoanCycle _id
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "clientInfo",
        },
      },
      { $unwind: "$clientInfo" },
      {
        $project: {
          _id: "$_id", // Keep LoanCycle's _id as the main ID
          AccountId: "$AccountId",
          ClientNo: "$ClientNo",
          LoanCycleNo: "$LoanCycleNo",
          LoanType: "$LoanType",
          LoanStatus: "$LoanStatus",
          LoanProcessStatus: "$LoanProcessStatus",
          LoanTerm: "$LoanTerm",
          LoanAmount: "$LoanAmount",
          PrincipalAmount: "$PrincipalAmount",
          LoanBalance: "$LoanBalance",
          LoanInterest: "$LoanInterest",
          Penalty: "$Penalty",
          PaymentMode: "$PaymentMode",
          StartPaymentDate: "$StartPaymentDate",
          MaturityDate: "$MaturityDate",
          CollectorName: "$CollectorName",
          Remarks: "$Remarks",
          Date_Encoded: "$Date_Encoded",
          Date_Modified: "$Date_Modified",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",

          FirstName: "$clientInfo.FirstName",
          MiddleName: "$clientInfo.MiddleName",
          LastName: "$clientInfo.LastName",
          Gender: "$clientInfo.Gender",
          CivilStatus: "$clientInfo.CivilStatus",
          ContactNumber: "$clientInfo.ContactNumber",
          AlternateContactNumber: "$clientInfo.AlternateContactNumber",
          Email: "$clientInfo.Email",
          BirthAddress: "$clientInfo.BirthAddress",
          DateOfBirth: "$clientInfo.DateOfBirth",
          CompanyName: "$clientInfo.CompanyName",
          Occupation: "$clientInfo.Occupation",
          MonthlyIncome: "$clientInfo.MonthlyIncome",
          NumberOfChildren: "$clientInfo.NumberOfChildren",
          Spouse: "$clientInfo.Spouse",
          WorkAddress: "$clientInfo.WorkAddress",
          Barangay: "$clientInfo.Barangay",
          City: "$clientInfo.City",
          Province: "$clientInfo.Province",
        },
      },
    ];

    const loan = await LoanCycle.aggregate(pipeline);

    if (!loan || loan.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    const clientNo = loan[0].ClientNo;
    const allClientLoans = await LoanCycle.find({ ClientNo: clientNo });

    const transformedLoan = transformLoan(loan[0]);
    transformedLoan.allClientLoans = allClientLoans.map(transformLoan);

    res.json({ success: true, data: transformedLoan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE loan by ID
export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { person, address, loanInfo, ...rest } = req.body;

    const toPascalCase = (obj) => {
      if (!obj) return {};
      return Object.entries(obj).reduce((acc, [key, value]) => {
        const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
        acc[pascalKey] = value;
        return acc;
      }, {});
    };

    // Extract special fields expected by frontend but mapped differently in DB
    const rawPerson = person || {};
    const {
      contactNo,
      alternateContactNo,
      email,
      spouseFirstName,
      spouseMiddleName,
      spouseLastName,
      ...personRest
    } = rawPerson;

    const loanClientUpdate = {
      ...toPascalCase(personRest),
      ...toPascalCase(address),
    };
    // Manual mappings for differently named schema fields
    if (contactNo !== undefined) loanClientUpdate.ContactNumber = contactNo;
    if (alternateContactNo !== undefined)
      loanClientUpdate.AlternateContactNumber = alternateContactNo;
    if (email !== undefined) loanClientUpdate.Email = email;
    // Spouse nested object mapping
    const anySpouseProvided =
      spouseFirstName !== undefined ||
      spouseMiddleName !== undefined ||
      spouseLastName !== undefined;
    if (anySpouseProvided) {
      loanClientUpdate.Spouse = {
        ...(spouseFirstName !== undefined && { FirstName: spouseFirstName }),
        ...(spouseMiddleName !== undefined && { MiddleName: spouseMiddleName }),
        ...(spouseLastName !== undefined && { LastName: spouseLastName }),
      };
    }
    const loanCycleUpdate = { ...rest };
    if (loanInfo) {
      if (loanInfo.status) loanCycleUpdate.LoanStatus = loanInfo.status;
      if (loanInfo.processStatus)
        loanCycleUpdate.LoanProcessStatus = loanInfo.processStatus;
      // Copy other loanInfo properties as well, converting to PascalCase if necessary
      Object.keys(loanInfo).forEach((key) => {
        if (key !== "status" && key !== "processStatus") {
          const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
          loanCycleUpdate[pascalKey] = loanInfo[key];
        }
      });
    }

    // Remove undefined fields
    Object.keys(loanClientUpdate).forEach(
      (key) =>
        loanClientUpdate[key] === undefined && delete loanClientUpdate[key]
    );
    Object.keys(loanCycleUpdate).forEach(
      (key) => loanCycleUpdate[key] === undefined && delete loanCycleUpdate[key]
    );

    // 🔐 Prevent accidental wiping of existing non-empty values with blank strings
    // Fetch existing client (once) to compare
    let existingClientDoc = await LoanClient.findOne({ ClientNo: (await LoanCycle.findById(id))?.ClientNo });
    if (existingClientDoc) {
      Object.keys(loanClientUpdate).forEach((key) => {
        if (
          typeof loanClientUpdate[key] === "string" &&
          loanClientUpdate[key].trim() === "" &&
          existingClientDoc[key] && existingClientDoc[key].toString().trim() !== ""
        ) {
          // Keep original non-empty value
            delete loanClientUpdate[key];
        }
      });
      // Handle nested spouse object separately
      if (loanClientUpdate.Spouse) {
        const existingSpouse = existingClientDoc.Spouse || {};
        ["FirstName", "MiddleName", "LastName"].forEach((nKey) => {
          if (
            loanClientUpdate.Spouse[nKey] !== undefined &&
            typeof loanClientUpdate.Spouse[nKey] === "string" &&
            loanClientUpdate.Spouse[nKey].trim() === "" &&
            existingSpouse[nKey] && existingSpouse[nKey].trim() !== ""
          ) {
            delete loanClientUpdate.Spouse[nKey];
          }
        });
        // If Spouse becomes empty after pruning, remove it to avoid unnecessary update
        if (Object.keys(loanClientUpdate.Spouse).length === 0) {
          delete loanClientUpdate.Spouse;
        }
      }
    }

    let updatedLoanCycle;
    if (Object.keys(loanCycleUpdate).length > 0) {
      updatedLoanCycle = await LoanCycle.findByIdAndUpdate(
        id,
        loanCycleUpdate,
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      updatedLoanCycle = await LoanCycle.findById(id);
    }

    if (!updatedLoanCycle) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    let updatedClient;
    if (Object.keys(loanClientUpdate).length > 0) {
      updatedClient = await LoanClient.findOneAndUpdate(
        { ClientNo: updatedLoanCycle.ClientNo },
        { $set: loanClientUpdate },
        { new: true, runValidators: true }
      );
    } else {
      updatedClient = await LoanClient.findOne({
        ClientNo: updatedLoanCycle.ClientNo,
      });
    }

    if (!updatedClient) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found for this loan." });
    }

    const combinedDoc = {
      ...updatedLoanCycle.toObject(),
      ...updatedClient.toObject(),
    };

    res.json({ success: true, data: transformLoan(combinedDoc) });
  } catch (err) {
    console.error("Error updating loan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE loan cycle by ID
export const updateLoanCycle = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure id is valid
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Loan cycle ID is required." });
    }

    // Find and update
    const updatedLoan = await LoanCycle.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedLoan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan cycle not found." });
    }

    // ✅ Keep LoanBalance and RunningBalance consistent if one is missing
    if (updatedLoan.LoanBalance && !updatedLoan.RunningBalance) {
      updatedLoan.RunningBalance = updatedLoan.LoanBalance;
      await updatedLoan.save();
    }

    res.json({
      success: true,
      message: "Loan cycle updated successfully.",
      data: updatedLoan,
    });
  } catch (err) {
    console.error("❌ Error updating loan cycle:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating loan cycle.",
      error: err.message,
    });
  }
};

// GET all distinct LoanStatus values
export const getLoanStatuses = async (req, res) => {
  try {
    const statuses = await LoanCycle.distinct("LoanStatus");
    res.json({ success: true, data: statuses });
  } catch (err) {
    console.error("Error fetching loan statuses:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Distinct PaymentMode
export const getPaymentModes = async (req, res) => {
  try {
    const modes = await LoanCycle.distinct("PaymentMode");
    res.json({ success: true, data: modes });
  } catch (err) {
    console.error("Error fetching payment modes:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET available loan years (from AccountId)
export const getLoanYears = async (req, res) => {
  try {
    const years = await LoanCycle.aggregate([
      {
        $project: {
          year: { $substr: ["$AccountId", 4, 4] }, // Extract "2024" from RCT-2024DB-0001
        },
      },
      { $group: { _id: "$year" } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: years.map((y) => y._id),
    });
  } catch (err) {
    console.error("Error in getLoanYears:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE loan
export const deleteLoan = async (req, res) => {
  try {
    await LoanCycle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Loan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET loans by ClientNo
export const getLoansByClientNo = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const pipeline = [
      { $match: { ClientNo: clientNo } },
      { $sort: { createdAt: -1 } }, // Sort by latest loan cycle first
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "clientInfo",
        },
      },
      { $unwind: "$clientInfo" },
      {
        $project: {
          _id: "$_id",
          AccountId: "$AccountId",
          ClientNo: "$ClientNo",
          LoanCycleNo: "$LoanCycleNo",
          LoanType: "$LoanType",
          LoanStatus: "$LoanStatus",
          LoanProcessStatus: "$LoanProcessStatus",
          LoanTerm: "$LoanTerm",
          LoanAmount: "$LoanAmount",
          PrincipalAmount: "$PrincipalAmount",
          LoanBalance: "$LoanBalance",
          LoanInterest: "$LoanInterest",
          Penalty: "$Penalty",
          PaymentMode: "$PaymentMode",
          StartPaymentDate: "$StartPaymentDate",
          MaturityDate: "$MaturityDate",
          CollectorName: "$CollectorName",
          Remarks: "$Remarks",
          Date_Encoded: "$Date_Encoded",
          Date_Modified: "$Date_Modified",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",

          FirstName: "$clientInfo.FirstName",
          MiddleName: "$clientInfo.MiddleName",
          LastName: "$clientInfo.LastName",
          Gender: "$clientInfo.Gender",
          CivilStatus: "$clientInfo.CivilStatus",
          ContactNumber: "$clientInfo.ContactNumber",
          AlternateContactNumber: "$clientInfo.AlternateContactNumber",
          Email: "$clientInfo.Email",
          BirthAddress: "$clientInfo.BirthAddress",
          DateOfBirth: "$clientInfo.DateOfBirth",
          CompanyName: "$clientInfo.CompanyName",
          Occupation: "$clientInfo.Occupation",
          MonthlyIncome: "$clientInfo.MonthlyIncome",
          NumberOfChildren: "$clientInfo.NumberOfChildren",
          Spouse: "$clientInfo.Spouse",
          WorkAddress: "$clientInfo.WorkAddress",
          Barangay: "$clientInfo.Barangay",
          City: "$clientInfo.City",
          Province: "$clientInfo.Province",
        },
      },
    ];

    const loans = await LoanCycle.aggregate(pipeline);

    if (!loans || loans.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No loans found for this client." });
    }

    res.json({ success: true, data: loans.map(transformLoan) });
  } catch (err) {
    console.error("Error in getLoansByClientNo:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET documents by ClientNo
export const getDocumentsByClientNo = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const documents = await LoanDocument.find({ ClientNo: clientNo }).sort({ createdAt: -1 });
    return res.json({ success: true, data: documents });
  } catch (err) {
    console.error("Error in getDocumentsByClientNo:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDocumentsByAccountId = async (req, res) => {
  try {
    const { accountId } = req.params;
    const documents = await LoanDocument.find({ AccountId: accountId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: documents });
  } catch (err) {
    console.error("Error in getDocumentsByAccountId:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDocumentsByAccountAndCycle = async (req, res) => {
  try {
    const { accountId, loanCycleNo } = req.params;
    const documents = await LoanDocument.find({ AccountId: accountId, LoanCycleNo: loanCycleNo }).sort({ createdAt: -1 });
    return res.json({ success: true, data: documents });
  } catch (err) {
    console.error("Error in getDocumentsByAccountAndCycle:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create document from external link (e.g., Google Drive)
export const createDocumentLink = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const { accountId } = req.body;
    const { name, link, type, source } = req.body;
    if (!name || !link) {
      return res.status(400).json({ success: false, message: "Name and link are required" });
    }
    const doc = await LoanDocument.create({
      ClientNo: clientNo,
      AccountId: accountId,
      name,
      link,
      type: type || inferTypeFromName(name || link),
      source: source || inferSourceFromLink(link),
      uploadedBy: req.user
        ? {
            _id: req.user._id,
            username: req.user.Username,
            position: req.user.Position,
          }
        : undefined,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("Error in createDocumentLink:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upload (file) document controller (expects formidable-parsed file attached on req.fileMeta by middleware)
export const uploadDocumentFile = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const { accountId } = req.body || {};
    const file = req.fileMeta; // set by middleware
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const doc = await LoanDocument.create({
      ClientNo: clientNo,
      AccountId: accountId,
      name: req.body?.name || file.originalFilename || file.newFilename,
      storagePath: file.relativePath,
      url: `/uploads/loan-documents/${file.newFilename}`,
      mimeType: file.mimetype,
      size: file.size,
      ext: path.extname(file.originalFilename).toLowerCase(),
      type: inferTypeFromName(file.originalFilename),
      source: "upload",
      uploadedBy: req.user
        ? {
            _id: req.user._id,
            username: req.user.Username,
            position: req.user.Position,
          }
        : undefined,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("Error in uploadDocumentFile:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create document link by AccountId (derive ClientNo)
export const createDocumentLinkByAccountId = async (req, res) => {
  try {
    const { accountId } = req.params;
    let { name, link, type, source } = req.body;
    if (Array.isArray(name)) name = name[name.length - 1];
    if (Array.isArray(link)) link = link[link.length - 1];
    if (Array.isArray(type)) type = type[type.length - 1];
    if (Array.isArray(source)) source = source[source.length - 1];
    if (!name || !link) {
      return res.status(400).json({ success: false, message: "Name and link are required" });
    }
    const loanCycle = await LoanCycle.findOne({ AccountId: accountId }).select("ClientNo AccountId");
    if (!loanCycle) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    const doc = await LoanDocument.create({
      ClientNo: loanCycle.ClientNo,
      AccountId: accountId,
      LoanCycleNo: loanCycle.LoanCycleNo,
      name,
      link,
      type: type || inferTypeFromName(name || link),
      source: source || inferSourceFromLink(link),
      uploadedBy: req.user
        ? {
            _id: req.user._id,
            username: req.user.Username,
            position: req.user.Position,
          }
        : undefined,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("Error in createDocumentLinkByAccountId:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upload document file by AccountId (derive ClientNo)
export const uploadDocumentFileByAccountId = async (req, res) => {
  try {
    const { accountId } = req.params;
    const loanCycle = await LoanCycle.findOne({ AccountId: accountId }).select("ClientNo AccountId");
    if (!loanCycle) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    const file = req.fileMeta;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    // Normalize body fields (can arrive as single-value arrays from FormData parsing)
    const rawName = req.body?.name;
    const rawType = req.body?.type;
    const rawSource = req.body?.source;
    const safeName = Array.isArray(rawName) ? rawName[rawName.length - 1] : rawName;
    const safeType = Array.isArray(rawType) ? rawType[rawType.length - 1] : rawType;
    const safeSource = Array.isArray(rawSource) ? rawSource[rawSource.length - 1] : rawSource;
    const doc = await LoanDocument.create({
      ClientNo: loanCycle.ClientNo,
      AccountId: accountId,
      LoanCycleNo: loanCycle.LoanCycleNo,
      name: safeName || file.originalFilename || file.newFilename,
      storagePath: file.relativePath,
      url: `/uploads/loan-documents/${file.newFilename}`,
      mimeType: file.mimetype,
      size: file.size,
      ext: path.extname(file.originalFilename).toLowerCase(),
      type: safeType || inferTypeFromName(file.originalFilename),
      source: safeSource || "upload",
      uploadedBy: req.user
        ? {
            _id: req.user._id,
            username: req.user.Username,
            position: req.user.Position,
          }
        : undefined,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("Error in uploadDocumentFileByAccountId:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await LoanDocument.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    // Remove file from disk if stored locally
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      try { fs.unlinkSync(doc.storagePath); } catch {}
    }
    await doc.deleteOne();
    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    console.error("Error in deleteDocument:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper inference functions
function inferTypeFromName(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
  if (lower.match(/\.(doc|docx)$/)) return "doc";
  if (lower.match(/\.(xls|xlsx)$/)) return "sheet";
  return "other";
}
function inferSourceFromLink(link = "") {
  if (link.includes("drive.google.com")) return "Google Drive";
  return "External";
}

// GET loans by AccountId
export const getLoansByAccountId = async (req, res) => {
  try {
    const { accountId } = req.params;
    const pipeline = [
      { $match: { AccountId: accountId } }, // Match by AccountId
      { $sort: { createdAt: -1 } }, // Sort by latest loan cycle first
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "clientInfo",
        },
      },
      { $unwind: "$clientInfo" },
      {
        $project: {
          _id: "$_id",
          AccountId: "$AccountId",
          ClientNo: "$ClientNo",
          LoanCycleNo: "$LoanCycleNo",
          LoanType: "$LoanType",
          LoanStatus: "$LoanStatus",
          LoanProcessStatus: "$LoanProcessStatus",
          LoanTerm: "$LoanTerm",
          LoanAmount: "$LoanAmount",
          PrincipalAmount: "$PrincipalAmount",
          LoanBalance: "$LoanBalance",
          LoanInterest: "$LoanInterest",
          Penalty: "$Penalty",
          PaymentMode: "$PaymentMode",
          StartPaymentDate: "$StartPaymentDate",
          MaturityDate: "$MaturityDate",
          CollectorName: "$CollectorName",
          Remarks: "$Remarks",
          Date_Encoded: "$Date_Encoded",
          Date_Modified: "$Date_Modified",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",

          FirstName: "$clientInfo.FirstName",
          MiddleName: "$clientInfo.MiddleName",
          LastName: "$clientInfo.LastName",
          Gender: "$clientInfo.Gender",
          CivilStatus: "$clientInfo.CivilStatus",
          ContactNumber: "$clientInfo.ContactNumber",
          AlternateContactNumber: "$clientInfo.AlternateContactNumber",
          Email: "$clientInfo.Email",
          BirthAddress: "$clientInfo.BirthAddress",
          DateOfBirth: "$clientInfo.DateOfBirth",
          CompanyName: "$clientInfo.CompanyName",
          Occupation: "$clientInfo.Occupation",
          MonthlyIncome: "$clientInfo.MonthlyIncome",
          NumberOfChildren: "$clientInfo.NumberOfChildren",
          Spouse: "$clientInfo.Spouse",
          WorkAddress: "$clientInfo.WorkAddress",
          Barangay: "$clientInfo.Barangay",
          City: "$clientInfo.City",
          Province: "$clientInfo.Province",
        },
      },
    ];

    const loans = await LoanCycle.aggregate(pipeline);

    if (!loans || loans.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No loans found for this account." });
    }

    res.json({ success: true, data: loans.map(transformLoan) });
  } catch (err) {
    console.error("Error in getLoansByAccountId:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// NEW: Get loan transactions
export const getLoanTransactions = async (req, res) => {
  try {
    const { accountId, loanCycleNo } = req.params;
    const { startDate, endDate } = req.query;

    const matchQuery = { AccountId: accountId, LoanCycleNo: loanCycleNo };
    const actualLimit = Number(limit);
    const skip = (page - 1) * actualLimit;

    const filterQuery = { LoanCycleNo: loanCycleNo };

    if (searchTerm) {
      filterQuery.CollectionReferenceNo = { $regex: searchTerm, $options: "i" };
    }
    if (paymentMode) {
      filterQuery.PaymentMode = paymentMode;
    }
    if (collectorName) {
      filterQuery.CollectorName = collectorName;
    }
    if (startDate && endDate) {
      filterQuery.PaymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const total = await LoanCollection.countDocuments(filterQuery);
    let collectionsQuery = LoanCollection.find(filterQuery).sort({
      PaymentDate: 1,
    });

    if (actualLimit > 0) {
      // Apply skip and limit only if limit is positive
      collectionsQuery = collectionsQuery.skip(skip).limit(actualLimit);
    }

    const collections = await collectionsQuery;

    res.json({
      success: true,
      data: collections,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("Error in getLoanTransactions:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// NEW: Generate Statement of Account (API endpoint)
export const generateStatementOfAccount = async (req, res) => {
  try {
    const { accountId, loanCycleNo } = req.params;
    const { startDate, endDate } = req.query;
    const statementData = await _getStatementOfAccountData(
      accountId,
      loanCycleNo,
      startDate,
      endDate
    );
    res.json({ success: true, data: statementData });
  } catch (err) {
    console.error("Error in generateStatementOfAccount:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// NEW: Generate Ledger (API endpoint)
export const generateLedger = async (req, res) => {
  try {
    const { accountId, loanCycleNo } = req.params;
    const { startDate, endDate } = req.query;
    const ledgerData = await _getLedgerData(
      accountId,
      loanCycleNo,
      startDate,
      endDate
    );
    res.json({ success: true, data: ledgerData });
  } catch (err) {
    console.error("Error in generateLedger:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// MODIFIED: Export loans and reports
export const exportReport = async (req, res) => {
  try {
    const { reportType, accountId, loanCycleNo, startDate, endDate } =
      req.query;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType || "Report");

    if (reportType === "allLoans") {
      const pipeline = [
        {
          $lookup: {
            from: "loan_clients",
            localField: "ClientNo",
            foreignField: "ClientNo",
            as: "clientInfo",
          },
        },
        { $unwind: "$clientInfo" },
        {
          $project: {
            _id: "$_id",
            AccountId: "$AccountId",
            ClientNo: "$ClientNo",
            LoanCycleNo: "$LoanCycleNo",
            LoanType: "$LoanType",
            LoanStatus: "$LoanStatus",
            PaymentMode: "$PaymentMode",
            LoanAmount: "$LoanAmount",
            LoanBalance: "$LoanBalance",
            createdAt: "$createdAt",
            FirstName: "$clientInfo.FirstName",
            MiddleName: "$clientInfo.MiddleName",
            LastName: "$clientInfo.LastName",
          },
        },
        { $sort: { createdAt: -1 } },
      ];

      const loans = await LoanCycle.aggregate(pipeline);

      worksheet.columns = [
        { header: "Loan No", key: "LoanNo", width: 20 },
        { header: "Account ID", key: "AccountId", width: 20 },
        { header: "Client No", key: "ClientNo", width: 20 },
        { header: "Full Name", key: "FullName", width: 30 },
        { header: "Loan Type", key: "LoanType", width: 15 },
        { header: "Loan Status", key: "LoanStatus", width: 20 },
        { header: "Payment Mode", key: "PaymentMode", width: 20 },
        { header: "Amount", key: "LoanAmount", width: 15 },
        { header: "Balance", key: "LoanBalance", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];

      loans.forEach((loan) => {
        worksheet.addRow({
          LoanNo: loan.LoanCycleNo,
          AccountId: loan.AccountId,
          ClientNo: loan.ClientNo,
          FullName: [loan.FirstName, loan.MiddleName, loan.LastName]
            .filter(Boolean)
            .join(" "),
          LoanType: loan.LoanType,
          LoanStatus: loan.LoanStatus,
          PaymentMode: loan.PaymentMode,
          LoanAmount: loan.LoanAmount,
          LoanBalance: loan.LoanBalance,
          createdAt: loan.createdAt
            ? new Date(loan.createdAt).toLocaleDateString()
            : "",
        });
      });
    } else if (
      reportType === "statement-of-account" &&
      accountId &&
      loanCycleNo
    ) {
      const statementData = await _getStatementOfAccountData(
        accountId,
        loanCycleNo,
        startDate,
        endDate
      );

      if (!statementData) {
        return res.status(404).json({
          success: false,
          message: "Statement of Account data not found.",
        });
      }

      // Add loan info header
      worksheet.addRow([
        `Statement of Account for Loan: ${statementData.loanInfo.loanCycleNo}`,
      ]);
      worksheet.addRow([`Client Name: ${statementData.loanInfo.clientName}`]);
      worksheet.addRow([`Account ID: ${statementData.loanInfo.accountId}`]);
      worksheet.addRow([`Loan Type: ${statementData.loanInfo.loanType}`]);
      worksheet.addRow([`Loan Amount: ${statementData.loanInfo.loanAmount}`]);
      worksheet.addRow([
        `Current Balance: ${statementData.loanInfo.currentBalance}`,
      ]);
      worksheet.addRow([]); // Empty row for spacing

      worksheet.columns = [
        { header: "Payment Date", key: "paymentDate", width: 18 },
        { header: "Description", key: "description", width: 30 },
        { header: "Principal Paid", key: "principalPaid", width: 18 },
        { header: "Interest Paid", key: "interestPaid", width: 18 },
        { header: "Penalty Paid", key: "penaltyPaid", width: 18 },
        { header: "Total Collected", key: "totalCollected", width: 18 },
        { header: "Running Balance", key: "runningBalance", width: 18 },
      ];

      statementData.transactions.forEach((t) => {
        worksheet.addRow({
          paymentDate: t.paymentDate
            ? new Date(t.paymentDate).toLocaleDateString()
            : "",
          description: t.description,
          principalPaid: t.principalPaid ? t.principalPaid.toString() : "0.00",
          interestPaid: t.interestPaid ? t.interestPaid.toString() : "0.00",
          penaltyPaid: t.penaltyPaid ? t.penaltyPaid.toString() : "0.00",
          totalCollected: t.totalCollected
            ? t.totalCollected.toString()
            : "0.00",
          runningBalance: t.runningBalance
            ? t.runningBalance.toString()
            : "0.00",
        });
      });
    } else if (reportType === "ledger" && accountId && loanCycleNo) {
      const ledgerData = await _getLedgerData(
        accountId,
        loanCycleNo,
        startDate,
        endDate
      );

      if (!ledgerData) {
        return res
          .status(404)
          .json({ success: false, message: "Ledger data not found." });
      }

      // Add loan info header
      worksheet.addRow([`Ledger for Loan: ${ledgerData.loanInfo.loanCycleNo}`]);
      worksheet.addRow([`Client Name: ${ledgerData.loanInfo.clientName}`]);
      worksheet.addRow([`Account ID: ${ledgerData.loanInfo.accountId}`]);
      worksheet.addRow([`Loan Type: ${ledgerData.loanInfo.loanType}`]);
      worksheet.addRow([`Loan Amount: ${ledgerData.loanInfo.loanAmount}`]);
      worksheet.addRow([
        `Current Balance: ${ledgerData.loanInfo.currentBalance}`,
      ]);
      worksheet.addRow([]); // Empty row for spacing

      worksheet.columns = [
        { header: "Date", key: "date", width: 18 },
        { header: "Description", key: "description", width: 30 },
        { header: "Debit", key: "debit", width: 18 },
        { header: "Credit", key: "credit", width: 18 },
        { header: "Running Balance", key: "runningBalance", width: 18 },
      ];

      ledgerData.entries.forEach((entry) => {
        worksheet.addRow({
          date: entry.date ? new Date(entry.date).toLocaleDateString() : "",
          description: entry.description,
          debit: entry.debit ? entry.debit.toString() : "0.00",
          credit: entry.credit ? entry.credit.toString() : "0.00",
          runningBalance: entry.runningBalance
            ? entry.runningBalance.toString()
            : "0.00",
        });
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid report type or missing parameters.",
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${reportType || "report"}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error in exportReport:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// NEW: Get loan details by loanCycleNo
export const getLoanDetailsByCycleNo = async (req, res) => {
  try {
    const { loanCycleNo } = req.params;

    const pipeline = [
      { $match: { LoanCycleNo: loanCycleNo } },
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "clientInfo",
        },
      },
      { $unwind: "$clientInfo" },
      {
        $project: {
          _id: "$_id",
          AccountId: "$AccountId",
          ClientNo: "$ClientNo",
          LoanCycleNo: "$LoanCycleNo",
          LoanType: "$LoanType",
          LoanStatus: "$LoanStatus",
          LoanProcessStatus: "$LoanProcessStatus",
          LoanTerm: "$LoanTerm",
          LoanAmount: "$LoanAmount",
          PrincipalAmount: "$PrincipalAmount",
          LoanBalance: "$LoanBalance",
          LoanInterest: "$LoanInterest",
          Penalty: "$Penalty",
          PaymentMode: "$PaymentMode",
          StartPaymentDate: "$StartPaymentDate",
          MaturityDate: "$MaturityDate",
          CollectorName: "$CollectorName",
          Remarks: "$Remarks",
          Date_Encoded: "$Date_Encoded",
          Date_Modified: "$Date_Modified",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",

          FirstName: "$clientInfo.FirstName",
          MiddleName: "$clientInfo.MiddleName",
          LastName: "$clientInfo.LastName",
          Gender: "$clientInfo.Gender",
          CivilStatus: "$clientInfo.CivilStatus",
          ContactNumber: "$clientInfo.ContactNumber",
          AlternateContactNumber: "$clientInfo.AlternateContactNumber",
          Email: "$clientInfo.Email",
          BirthAddress: "$clientInfo.BirthAddress",
          DateOfBirth: "$clientInfo.DateOfBirth",
          CompanyName: "$clientInfo.CompanyName",
          Occupation: "$clientInfo.Occupation",
          MonthlyIncome: "$clientInfo.MonthlyIncome",
          NumberOfChildren: "$clientInfo.NumberOfChildren",
          Spouse: "$clientInfo.Spouse",
          WorkAddress: "$clientInfo.WorkAddress",
          Barangay: "$clientInfo.Barangay",
          City: "$clientInfo.City",
          Province: "$clientInfo.Province",
        },
      },
    ];

    const loan = await LoanCycle.aggregate(pipeline);

    if (!loan || loan.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loan not found for this Loan Cycle No.",
      });
    }

    res.json({ success: true, data: transformLoan(loan[0]) });
  } catch (err) {
    console.error("Error in getLoanDetailsByCycleNo:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE a new loan application
export const createLoanApplication = async (req, res) => {
  try {
    const applicationData = req.body;

    if (applicationData.LoanType === "Renewal" && applicationData.AccountId) {
      const baseAccountId = applicationData.AccountId.split("-R")[0];

      const renewalLoans = await LoanCycle.find({
        AccountId: new RegExp(`^${baseAccountId}`),
      });
      const pendingRenewalApps = await LoanClientApplication.find({
        AccountId: new RegExp(`^${baseAccountId}`),
      });

      let maxRevision = 0;
      const allLoans = [...renewalLoans, ...pendingRenewalApps];
      allLoans.forEach((loan) => {
        const match = loan.AccountId.match(/-R(\d+)$/);
        if (match && match[1]) {
          const revision = parseInt(match[1], 10);
          if (revision > maxRevision) {
            maxRevision = revision;
          }
        }
      });

      const nextRevision = maxRevision + 1;
      applicationData.AccountId = `${baseAccountId}-R${nextRevision}`;
    }

    const newApplication = new LoanClientApplication(applicationData);
    const savedApplication = await newApplication.save();
    res.status(201).json({ success: true, data: savedApplication });
  } catch (err) {
    console.error("Error in createLoanApplication:", err);
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: "Duplicate Account ID. Please try again.",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// Search for clients
export const searchClients = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const searchRegex = new RegExp(q, "i");
    const clients = await LoanClient.find({
      $or: [
        { FirstName: { $regex: searchRegex } },
        { LastName: { $regex: searchRegex } },
        { AccountId: { $regex: searchRegex } },
      ],
    });

    res.json({ success: true, data: clients });
  } catch (err) {
    console.error("Error in searchClients:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to search clients" });
  }
};

export const getClientDetailsForRenewal = async (req, res) => {
  try {
    const { clientNo } = req.params;
    if (!clientNo) {
      return res
        .status(400)
        .json({ success: false, message: "Client number is required" });
    }

    const client = await LoanClient.findOne({ ClientNo: clientNo });
    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    const lastLoan = await LoanCycle.findOne({ ClientNo: clientNo })
      .sort({ createdAt: -1 })
      .limit(1);

    res.json({ success: true, data: { client, lastLoan } });
  } catch (err) {
    console.error("Error in getClientDetailsForRenewal:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get client details" });
  }
};

export const getApprovedClients = async (req, res) => {
  try {
    // Find all loan cycles with approved status
    const approvedLoans = await LoanCycle.find({
      LoanStatus: "LOAN APPROVED",
    }).distinct("ClientNo");

    // Find all clients with these client numbers
    const clients = await LoanClient.find({ ClientNo: { $in: approvedLoans } });

    res.json({ success: true, data: clients });
  } catch (err) {
    console.error("Error in getApprovedClients:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get approved clients" });
  }
};

export const exportLoansExcel = async (req, res) => {
  try {
    //console.log("🟢 Export request received:", req.query);

    const {
      q = "",
      loanStatus,
      paymentMode,
      year,
      sortBy = "AccountId",
      sortDir = "asc",
    } = req.query;

    const match = {};
    if (loanStatus) match.LoanStatus = loanStatus;
    if (paymentMode) match.PaymentMode = paymentMode;
    if (year) match.AccountId = { $regex: `^RCT-${year}`, $options: "i" };
    if (q) {
      const regex = new RegExp(q, "i");
      match.$or = [
        { AccountId: regex },
        { ClientNo: regex },
        { LoanCycleNo: regex },
        { CollectorName: regex },
      ];
    }

    const sort = { [sortBy]: sortDir === "desc" ? -1 : 1 };

    // console.log("📄 Match:", match);
    // console.log("📄 Sort:", sort);

    // 🧭 Query DB
    const loans = await LoanCycle.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "loan_clients",
          localField: "ClientNo",
          foreignField: "ClientNo",
          as: "clientInfo",
        },
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      { $sort: sort },
    ]);

    //console.log(`✅ Found ${loans.length} loans`);

    // 🧾 Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Loans Export");

    worksheet.columns = [
      { header: "Account ID", key: "AccountId", width: 20 },
      { header: "Loan No", key: "LoanCycleNo", width: 20 },
      { header: "Client No", key: "ClientNo", width: 20 },
      { header: "Client Name", key: "ClientName", width: 30 },
      { header: "Loan Status", key: "LoanStatus", width: 15 },
      { header: "Process Status", key: "LoanProcessStatus", width: 20 },
      { header: "Loan Amount", key: "LoanAmount", width: 15 },
      { header: "Loan Balance", key: "LoanBalance", width: 15 },
      { header: "Payment Mode", key: "PaymentMode", width: 15 },
      { header: "Collector", key: "CollectorName", width: 25 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };

    // 💾 Add rows safely
    loans.forEach((loan, i) => {
      try {
        worksheet.addRow({
          AccountId: loan.AccountId || "",
          LoanCycleNo: loan.LoanCycleNo || "",
          ClientNo: loan.ClientNo || "",
          ClientName: `${loan.clientInfo?.FirstName || ""} ${
            loan.clientInfo?.MiddleName || ""
          } ${loan.clientInfo?.LastName || ""}`.trim(),
          LoanStatus: loan.LoanStatus || "",
          LoanProcessStatus: loan.LoanProcessStatus || "",
          LoanAmount: loan.LoanAmount || 0,
          LoanBalance: loan.LoanBalance || 0,
          PaymentMode: loan.PaymentMode || "",
          CollectorName: loan.CollectorName || "",
          createdAt: loan.createdAt
            ? new Date(loan.createdAt).toLocaleDateString()
            : "",
        });
      } catch (err) {
        console.error(`❌ Row ${i} error:`, err.message);
      }
    });

    worksheet.getColumn("LoanAmount").numFmt = "#,##0.00";
    worksheet.getColumn("LoanBalance").numFmt = "#,##0.00";

    // ⚡ Create buffer instead of writing stream
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=loans_export_${Date.now()}.xlsx`
    );

    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Error exporting loans:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export loans",
      error: error.message,
      stack: error.stack,
    });
  }
};

// DEBUG: Return raw loan client document (no transforms) for a given client number
export const debugGetRawClient = async (req, res) => {
  try {
    const { clientNo } = req.params;
    if (!clientNo) return res.status(400).json({ success: false, message: "clientNo required" });
    const doc = await LoanClient.findOne({ ClientNo: clientNo });
    if (!doc) return res.status(404).json({ success: false, message: "Client not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DEBUG: List clients whose any name component is blank or null
export const debugListClientsMissingNames = async (_req, res) => {
  try {
    const clients = await LoanClient.find({
      $or: [
        { FirstName: { $in: [null, ""] } },
        { LastName: { $in: [null, ""] } },
      ],
    }).limit(200);
    res.json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DEBUG: Manually repair / set client names if they were accidentally blanked
export const debugUpdateClientNames = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const { firstName, middleName, lastName } = req.body || {};
    if (!clientNo) return res.status(400).json({ success: false, message: "clientNo required" });
    if (!firstName && !lastName) {
      return res.status(400).json({ success: false, message: "At least firstName or lastName must be provided" });
    }
    const update = {};
    if (firstName !== undefined) update.FirstName = firstName;
    if (middleName !== undefined) update.MiddleName = middleName;
    if (lastName !== undefined) update.LastName = lastName;
    const doc = await LoanClient.findOneAndUpdate(
      { ClientNo: clientNo },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Client not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
