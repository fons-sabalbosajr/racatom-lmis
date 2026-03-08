
import LoanCycle from "../models/LoanCycle.js";
import LoanClientsCollection from "../models/LoanClientsCollection.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalLoans = await LoanCycle.countDocuments();

    const totalDisbursedAggregate = await LoanCycle.aggregate([
      { $group: { _id: null, total: { $sum: "$LoanAmount" } } },
    ]);
    const totalDisbursed = totalDisbursedAggregate.length > 0 ? totalDisbursedAggregate[0].total : 0;

    // Upcoming payments: count active (non-closed) loans that likely still require payments.
    const upcomingPayments = await LoanCycle.countDocuments({
      LoanStatus: { $ne: "CLOSED" },
      $or: [
        { LoanBalance: { $gt: 0 } },
        { LoanBalance: { $exists: false } },
      ],
    });

    const averageLoanAmount = totalLoans > 0 ? totalDisbursed / totalLoans : 0;

    // Total outstanding balance
    const outstandingAggregate = await LoanCycle.aggregate([
      { $match: { LoanStatus: { $ne: "CLOSED" } } },
      { $group: { _id: null, total: { $sum: "$LoanBalance" } } },
    ]);
    const totalOutstandingBalance = outstandingAggregate.length > 0 ? outstandingAggregate[0].total : 0;

    // Total collected (from collections)
    let totalCollected = 0;
    try {
      const collectedAgg = await LoanClientsCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$CollectionPayment" } } },
      ]);
      totalCollected = collectedAgg.length > 0 ? collectedAgg[0].total : 0;
    } catch {}

    // Collection rate (collected / disbursed * 100)
    const collectionRate = totalDisbursed > 0 ? ((totalCollected / totalDisbursed) * 100) : 0;

    // Monthly disbursement trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    let monthlyDisbursement = [];
    try {
      monthlyDisbursement = await LoanCycle.aggregate([
        { $match: { StartPaymentDate: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$StartPaymentDate" } },
          disbursed: { $sum: "$LoanAmount" },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", disbursed: 1, count: 1 } },
      ]);
    } catch {}

    // Payment mode distribution
    let paymentModeDistribution = [];
    try {
      paymentModeDistribution = await LoanCycle.aggregate([
        { $match: { LoanStatus: { $ne: "CLOSED" } } },
        { $group: { _id: "$PaymentMode", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: "$count" } },
      ]);
    } catch {}

    const loanStatusCounts = await LoanCycle.aggregate([
      { $group: { _id: "$LoanStatus", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: "$count" } },
    ]);

    const loanTypeCounts = await LoanCycle.aggregate([
      { $group: { _id: "$LoanType", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
    ]);

    const loanCollectorCounts = await LoanCycle.aggregate([
      { $group: { _id: "$CollectorName", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalLoans,
          totalDisbursed,
          upcomingPayments,
          averageLoanAmount,
          totalOutstandingBalance,
          totalCollected,
          collectionRate,
        },
        loanStatusChartData: loanStatusCounts,
        loanTypeChartData: loanTypeCounts,
        loanCollectorChartData: loanCollectorCounts,
        monthlyDisbursement,
        paymentModeDistribution,
      },
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
