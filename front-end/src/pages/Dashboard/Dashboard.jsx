import React, { useState, useEffect, useCallback } from "react";
import { Typography, message, Row, Col } from "antd";
import api from "../../utils/axios";
import LoanDetailsModal from "../../pages/Loans/components/LoanDetailsModal";
import "./dashboard.css";

// Import new components
import DashboardStats from "./components/DashboardStats";
import LoanStatusChart from "./components/LoanStatusChart";
import LoanTypeChart from "./components/LoanTypeChart";
import RecentLoansTable from "./components/RecentLoansTable";

const { Title } = Typography;

function Dashboard() {
  const [stats, setStats] = useState({
    totalLoans: 0,
    totalDisbursed: 0,
    upcomingPayments: 0,
    averageLoanAmount: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [loanTypeData, setLoanTypeData] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pageSizeOptions: ["5", "10", "20", "50"],
  });
  const [sort, setSort] = useState({ sortBy: "LoanStatus", sortDir: "asc" });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const viewLoan = async (record) => {
    setLoading(true);
    try {
      const loansRes = await api.get(`/loans/client/${record.clientNo}`);
      const docsRes = await api.get(
        `/loans/client/${record.clientNo}/documents`
      );

      if (loansRes.data.success && docsRes.data.success) {
        const currentLoan = loansRes.data.data.find(
          (loan) => loan._id === record._id
        );
        if (currentLoan) {
          setSelectedLoan({
            ...currentLoan,
            allClientLoans: loansRes.data.data,
            clientDocuments: docsRes.data.data,
          });
          setModalVisible(true);
        } else {
          message.error("Loan details not found.");
        }
      } else {
        message.error("Failed to fetch client data.");
      }
    } catch (err) {
      console.error(err);
      message.error("Error fetching client data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = useCallback(
    async (page, limit, sortBy, sortDir, filters) => {
      setLoading(true);
      try {
        // Fetch paginated data for the table first to get meta
        const recentLoansRes = await api.get("/loans", {
          params: { page, limit, sortBy, sortDir, ...filters },
        });

        if (!recentLoansRes.data.success) {
          message.error("Failed to load recent loans data.");
          return;
        }

        const newMeta = {
          page: Number(recentLoansRes.data.meta.page) || 1,
          limit: Number(recentLoansRes.data.meta.limit) || 5,
          total: Number(recentLoansRes.data.meta.total) || 0,
          pageSizeOptions: ["5", "10", "20", "50"],
        };

        setRecentLoans(recentLoansRes.data.data);
        setMeta(newMeta);

        const totalLoans = newMeta.total;

        if (totalLoans > 0) {
          // If there are loans, fetch all of them to calculate stats
          const allLoansRes = await api.get("/loans", {
            params: { ...filters, limit: totalLoans },
          });

          if (allLoansRes.data.success) {
            const allLoans = allLoansRes.data.data;

            const totalDisbursed = allLoans.reduce(
              (acc, loan) =>
                acc +
                Number(String(loan.LoanAmount || 0).replace(/[₱,]/g, "")),
              0
            );
            const upcomingPayments = allLoans.filter(
              (loan) => new Date(loan.MaturityDate) > new Date()
            ).length;
            const totalLoanAmount = allLoans.reduce(
              (acc, loan) =>
                acc +
                Number(String(loan.LoanAmount || 0).replace(/[₱,]/g, "")),
              0
            );
            const averageLoanAmount =
              allLoans.length > 0 ? totalLoanAmount / allLoans.length : 0;

            setStats({
              totalLoans,
              totalDisbursed,
              upcomingPayments,
              averageLoanAmount,
            });

            const statusCounts = allLoans.reduce((acc, loan) => {
              const status = loan.LoanStatus || "Unknown";
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {});
            setChartData(
              Object.keys(statusCounts).map((status) => ({
                name: status,
                count: statusCounts[status],
              }))
            );

            const loanTypeCounts = allLoans.reduce((acc, loan) => {
              const type = loan.LoanType || "Unknown";
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {});
            setLoanTypeData(
              Object.keys(loanTypeCounts).map((type) => ({
                name: type,
                value: loanTypeCounts[type],
              }))
            );
          } else {
            message.error("Failed to load full loan data for statistics.");
          }
        } else {
          // No loans match the filter, reset stats
          setStats({
            totalLoans: 0,
            totalDisbursed: 0,
            upcomingPayments: 0,
            averageLoanAmount: 0,
          });
          setChartData([]);
          setLoanTypeData([]);
        }
      } catch (err) {
        console.error(err);
        message.error("An error occurred while fetching dashboard data.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDashboardData(meta.page, meta.limit, sort.sortBy, sort.sortDir, {});
  }, [fetchDashboardData]);

  const handleTableChange = (pagination, filters, sorter) => {
    let newSortBy = sort.sortBy;
    let newSortDir = sort.sortDir;

    if (sorter && sorter.field) {
      newSortBy = sorter.field;
      newSortDir = sorter.order === "ascend" ? "asc" : "desc";
    }

    setSort({ sortBy: newSortBy, sortDir: newSortDir });
    fetchDashboardData(
      pagination.current,
      pagination.pageSize,
      newSortBy,
      newSortDir,
      filters
    );
  };

  return (
    <div className="dashboard-container">
      <Title level={2} className="dashboard-title">
        Loan Management Dashboard
      </Title>
      <DashboardStats stats={stats} loading={loading} />
      <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
        <Col xs={24} md={16}>
          <LoanStatusChart chartData={chartData} />
        </Col>
        <Col xs={24} md={8}>
          <LoanTypeChart loanTypeData={loanTypeData} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
        <RecentLoansTable
          recentLoans={recentLoans}
          loading={loading}
          meta={meta}
          handleTableChange={handleTableChange}
          viewLoan={viewLoan}
          sort={sort}
        />
      </Row>

      <LoanDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        loan={selectedLoan}
        loading={loading}
      />
    </div>
  );
}

export default Dashboard;