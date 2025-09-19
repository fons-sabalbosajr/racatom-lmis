import LoanApproved from "../models/LoanApproved.js";
import ExcelJS from "exceljs";

// Merge / reshape function
const transformLoan = (doc) => {
  const loan = doc.toObject ? doc.toObject() : doc;

  const fullName = [loan.FirstName, loan.MiddleName, loan.LastName]
    .filter(Boolean)
    .join(" ");

  return {
    _id: loan._id,
    fullName,
    clientNo: loan.ClientNo,
    accountId: loan.AccountId,
    loanNo: loan.LoanNo,
    FirstName: loan.FirstName,
    MiddleName: loan.MiddleName,
    LastName: loan.LastName,
    BirthAddress: loan.BirthAddress,
    CivilStatus: loan.CivilStatus,
    DateOfBirth: loan.DateOfBirth,
    Gender: loan.Gender,
    MonthlyIncome: loan.MonthlyIncome,
    NumberOfChildren: loan.NumberOfChildren,
    Occupation: loan.Occupation,
    CompanyName: loan.CompanyName,
    WorkAddress: loan.WorkAddress,

    LoanType: loan.LoanType,
    LoanStatus: loan.LoanStatus || "Unknown",
    LoanProcessStatus: loan.LoanProcessStatus,
    LoanTerm: loan.LoanTerm,
    LoanAmount: Number(String(loan.LoanAmount || 0).replace(/[₱,]/g, "")),
    LoanAmortization: Number(
      String(loan.LoanAmortization || 0).replace(/[₱,]/g, "")
    ),
    LoanBalance: Number(String(loan.LoanBalance || 0).replace(/[₱,]/g, "")),
    Penalty: Number(String(loan.Penalty || 0).replace(/[₱,]/g, "")),
    LoanInterest: Number(String(loan.LoanInterest || 0).replace(/[₱,]/g, "")),

    PaymentMode: loan.PaymentMode,
    StartPaymentDate: loan.StartPaymentDate,
    MaturityDate: loan.MaturityDate,
    Date_Encoded: loan.Date_Encoded,
    Date_Modified: loan.Date_Modified,
    CollectorName: loan.CollectorName,

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
      firstName: loan.SpouseFirstName,
      middleName: loan.SpouseMiddleName,
      lastName: loan.SpouseLastName,
    },

    timestamps: {
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    },
  };
};

// GET all loans (with full filtering)
export const getLoans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      searchTerm = "",
      loanStatus,
      paymentMode,
      year,
      sortBy = "AccountId",
      sortDir = "asc",
    } = req.query;

    const query = {};

    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i'); // Case-insensitive search
      query.$or = [
        { LoanNo: { $regex: searchRegex } },
        { ClientNo: { $regex: searchRegex } },
        { LastName: { $regex: searchRegex } },
        { FirstName: { $regex: searchRegex } },
        { MiddleName: { $regex: searchRegex } },
        { CollectorName: { $regex: searchRegex } },
        { LoanStatus: { $regex: searchRegex } },
        { LoanType: { $regex: searchRegex } },
        { Barangay: { $regex: searchRegex } },
        { City: { $regex: searchRegex } },
        { Province: { $regex: searchRegex } },
        { PaymentMode: { $regex: searchRegex } },
        { LoanProcessStatus: { $regex: searchRegex } },
      ];
    }

    
    
    
    

    const pipeline = [{ $match: query }];

    // ✅ in getLoans
    if (sortBy === "LoanStatus") {
      const customOrder = [
        "UPDATED",
        "PAST DUE",
        "ARREARS",
        "LITIGATION",
        "DORMANT",
      ];
      pipeline.push({
        $addFields: {
          __sortOrder: {
            $indexOfArray: [customOrder, { $toUpper: "$LoanStatus" }],
          },
        },
      });
      pipeline.push({ $sort: { __sortOrder: 1 } }); // ascending by custom order
    } else if (sortBy === "MaturityDate") {
      pipeline.push({ $sort: { MaturityDate: -1 } }); // latest first
    } else {
      const sortOptions = {};
      sortOptions[sortBy] = sortDir === "asc" ? 1 : -1;
      pipeline.push({ $sort: sortOptions });
    }

    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: Number(limit) });

    const loans = await LoanApproved.aggregate(pipeline).collation({
      locale: "en",
      numericOrdering: true,
    });

    const total = await LoanApproved.countDocuments(query);

    res.json({
      success: true,
      data: loans.map(transformLoan),
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("Error in getLoans:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET loan by id
export const getLoanById = async (req, res) => {
  try {
    const loan = await LoanApproved.findById(req.params.id);
    if (!loan)
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });

    res.json({ success: true, data: transformLoan(loan) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE loan by ID
export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedLoan = await LoanApproved.findByIdAndUpdate(id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Run Mongoose validators on update
    });

    if (!updatedLoan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    res.json({ success: true, data: transformLoan(updatedLoan) });
  } catch (err) {
    console.error("Error updating loan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all distinct LoanStatus values
export const getLoanStatuses = async (req, res) => {
  try {
    const statuses = await LoanApproved.distinct("LoanStatus");
    res.json({ success: true, data: statuses });
  } catch (err) {
    console.error("Error fetching loan statuses:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Distinct PaymentMode
export const getPaymentModes = async (req, res) => {
  try {
    const modes = await LoanApproved.distinct("PaymentMode");
    res.json({ success: true, data: modes });
  } catch (err) {
    console.error("Error fetching payment modes:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET available loan years (from AccountId)
export const getLoanYears = async (req, res) => {
  try {
    const years = await LoanApproved.aggregate([
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
    await LoanApproved.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Loan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportLoans = async (req, res) => {
  try {
    const loans = await LoanApproved.find({}).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Loans");

    // Define columns with widths
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

    // Add rows
    loans.forEach((loan) => {
      worksheet.addRow({
        LoanNo: loan.LoanNo,
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

    // Set response headers for download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=loans.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET loans by ClientNo
export const getLoansByClientNo = async (req, res) => {
  try {
    const { clientNo } = req.params;
    const loans = await LoanApproved.find({ ClientNo: clientNo });

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
    // Placeholder: Replace with actual Document model query
    // const documents = await Document.find({ ClientNo: clientNo });
    const documents = []; // No Document model available, returning empty array

    if (!documents || documents.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No documents found for this client.",
      });
    }

    res.json({ success: true, data: documents });
  } catch (err) {
    console.error("Error in getDocumentsByClientNo:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};