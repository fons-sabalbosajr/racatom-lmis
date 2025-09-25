
import LoanCycle from "../models/LoanCycle.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalLoans = await LoanCycle.countDocuments();

    const totalDisbursedAggregate = await LoanCycle.aggregate([
      { $group: { _id: null, total: { $sum: "$LoanAmount" } } },
    ]);
    const totalDisbursed = totalDisbursedAggregate.length > 0 ? totalDisbursedAggregate[0].total : 0;

    const upcomingPayments = await LoanCycle.countDocuments({
      MaturityDate: { $gt: new Date() },
    });

    const averageLoanAmount = totalLoans > 0 ? totalDisbursed / totalLoans : 0;

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
        },
        loanStatusChartData: loanStatusCounts,
        loanTypeChartData: loanTypeCounts,
        loanCollectorChartData: loanCollectorCounts,
      },
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
