import React, { useState, useEffect, useCallback } from "react";
import { Typography, message, Row, Col, Button } from "antd";
import api from "../../utils/axios";
import LoanDetailsModal from "../../pages/Loans/components/LoanDetailsModal";
import LoanApplication from "./components/LoanApplication/LoanApplication";
import ChartDetailsModal from "./components/ChartDetailsModal"; // Import new modal
import "./dashboard.css";

// Import new components
import DashboardStats from "./components/DashboardStats";
import LoanStatusChart from "./components/LoanStatusChart";
import LoanTypeChart from "./components/LoanTypeChart";
import LoanCollectorChart from "./components/LoanCollectorChart";
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
  const [loanCollectorData, setLoanCollectorData] = useState([]);
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

  // State for the new details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsModalTitle, setDetailsModalTitle] = useState("");
  const [detailsModalFilter, setDetailsModalFilter] = useState(null);
  const [loanAppModalVisible, setLoanAppModalVisible] = useState(false);

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
        // Fetch dashboard stats
        const statsRes = await api.get("/dashboard/stats");
        if (statsRes.data.success) {
          setStats(statsRes.data.data.stats);
          setChartData(statsRes.data.data.loanStatusChartData);
          setLoanTypeData(statsRes.data.data.loanTypeChartData);
          setLoanCollectorData(statsRes.data.data.loanCollectorChartData || []); // Set new chart data
        } else {
          message.error("Failed to load dashboard statistics.");
        }

        // Fetch paginated data for the table
        const recentLoansRes = await api.get("/loans", {
          params: { page, limit, sortBy, sortDir, ...filters },
        });

        if (recentLoansRes.data.success) {
          setRecentLoans(recentLoansRes.data.data);
          setMeta({
            page: Number(recentLoansRes.data.meta.page) || 1,
            limit: Number(recentLoansRes.data.meta.limit) || 5,
            total: Number(recentLoansRes.data.meta.total) || 0,
            pageSizeOptions: ["5", "10", "20", "50"],
          });
        } else {
          message.error("Failed to load recent loans data.");
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

  // Handler to open the details modal
  const handleChartClick = (filter, title) => {
    setDetailsModalFilter(filter);
    setDetailsModalTitle(title);
    setDetailsModalVisible(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-title-container">
        <Title level={2} className="dashboard-title">
          Loan Management Dashboard
        </Title>
        <div className="dashboard-actions">
          <Button
            type="primary"
            onClick={() => setLoanAppModalVisible(true)}
            style={{ marginRight: "8px" }}
          >
            New Loan Application
          </Button>
          <Button type="primary" className="pending-applications-btn">
            Pending Applications
          </Button>
        </div>
      </div>
      <DashboardStats stats={stats} loading={loading} />
      <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
        <Col xs={24} md={12}>
          <LoanStatusChart
            chartData={chartData}
            onDataClick={handleChartClick}
          />
        </Col>
        <Col xs={24} md={6}>
          <LoanTypeChart
            loanTypeData={loanTypeData}
            onDataClick={handleChartClick}
          />
        </Col>
        <Col xs={24} md={6}>
          <LoanCollectorChart
            loanCollectorData={loanCollectorData}
            onDataClick={handleChartClick}
          />
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

      <LoanApplication
        visible={loanAppModalVisible}
        onClose={() => setLoanAppModalVisible(false)}
        api={api} /* pass axios wrapper from Dashboard */
      />

      {/* New Details Modal */}
      {detailsModalVisible && (
        <ChartDetailsModal
          visible={detailsModalVisible}
          onClose={() => setDetailsModalVisible(false)}
          title={detailsModalTitle}
          filter={detailsModalFilter}
        />
      )}
    </div>
  );
}

export default Dashboard;
