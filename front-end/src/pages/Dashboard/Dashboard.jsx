import React, { useState, useEffect, useCallback } from "react";
import { Typography, message, Row, Col, Button, Badge, Space } from "antd";
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
import PendingApplication from "./components/PendingApplication/PendingApplication";

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
  const [sort, setSort] = useState({
    sortBy: "StartPaymentDate",
    sortDir: "desc",
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // State for the new details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsModalTitle, setDetailsModalTitle] = useState("");
  const [detailsModalFilter, setDetailsModalFilter] = useState(null);
  const [loanAppModalVisible, setLoanAppModalVisible] = useState(false);
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loanRates, setLoanRates] = useState([]);

  // Fetch pending applications count
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get("/loan_clients_application/pending");
      if (res.data?.success) {
        setPendingCount(Array.isArray(res.data.data) ? res.data.data.length : 0);
      }
    } catch (err) {
      // keep silent to avoid noisy UI; console.debug for dev
      // console.debug("Pending count fetch error", err?.response?.data || err?.message);
    }
  }, []);

  const viewLoan = async (record) => {
    setLoading(true);
    try {
      // ✅ FIX: Get clientNo from the correct nested property and add a safeguard.
      const clientNo = record.loanInfo?.clientNo || record.clientNo;

      if (!clientNo) {
        message.error("Could not find a client number for this record.");
        setLoading(false);
        return;
      }

      const loansRes = await api.get(`/loans/client/${clientNo}`);
      const docsRes = await api.get(`/loans/client/${clientNo}/documents`);

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

  // Fetch dashboard charts and stats (once or when dashboard-level filters change)
  const fetchChartsAndStats = useCallback(async () => {
    try {
      const statsRes = await api.get("/dashboard/stats");
      if (statsRes.data.success) {
        setStats(statsRes.data.data.stats);
        setChartData(statsRes.data.data.loanStatusChartData);
        setLoanTypeData(statsRes.data.data.loanTypeChartData);
        setLoanCollectorData(statsRes.data.data.loanCollectorChartData || []);
      } else {
        message.error("Failed to load dashboard statistics.");
      }
    } catch (err) {
      console.error(err);
      message.error("An error occurred while fetching dashboard statistics.");
    }
  }, []);

  // Fetch paginated recent loans for the table (does not touch charts)
  const fetchRecentLoans = useCallback(
    async (page, limit, sortBy, sortDir, filters) => {
      setLoading(true);
      try {
        const recentLoansRes = await api.get("/loans", {
          params: {
            page,
            limit,
            sortBy,
            sortDir,
            q: filters?.searchTerm || "",
          },
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
        message.error("An error occurred while fetching recent loans.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const fetchLoanRates = async () => {
      try {
        const res = await api.get("/loan_rates"); // adjust endpoint if needed
        if (res.data.success) {
          setLoanRates(res.data.data);
        } else {
          message.warning("Failed to load loan rates.");
        }
      } catch (err) {
        console.error(err);
        message.error("Error loading loan rates.");
      }
    };

    fetchChartsAndStats();
    fetchRecentLoans(meta.page, meta.limit, sort.sortBy, sort.sortDir, {});
    fetchLoanRates(); // ✅ load once on mount
    fetchPendingCount();
  }, [fetchChartsAndStats, fetchRecentLoans]);

  // Real-time update: poll pending count every 10s, pause when tab hidden
  useEffect(() => {
    let intervalId;
    const start = () => {
      intervalId = setInterval(fetchPendingCount, 10000);
    };
    const stop = () => {
      if (intervalId) clearInterval(intervalId);
    };
    // Start immediately
    start();
    // Visibility handler
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchPendingCount();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchPendingCount]);

  // When pending modal closes, refresh count (approvals/rejections may have changed it)
  useEffect(() => {
    if (!pendingModalVisible) {
      fetchPendingCount();
    }
  }, [pendingModalVisible, fetchPendingCount]);

  const handleTableChange = (pagination, filters, sorter) => {
    let newSortBy = sort.sortBy;
    let newSortDir = sort.sortDir;

    if (sorter && sorter.field) {
      newSortBy = sorter.field;
      newSortDir = sorter.order === "ascend" ? "asc" : "desc";
    }

    setSort({ sortBy: newSortBy, sortDir: newSortDir });

    fetchRecentLoans(
      pagination.current,
      pagination.pageSize,
      newSortBy,
      newSortDir,
      filters // ✅ filters include searchTerm
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
        <Title level={3} className="dashboard-title">Loan Management Dashboard</Title>
        <div className="dashboard-actions">
          <Button
            type="primary"
            onClick={() => setLoanAppModalVisible(true)}
            className="loan-applications-btn"
          >
            New Loan Application
          </Button>
          <Space>
            <Badge count={pendingCount} offset={[2, 0]} color="red">
              <Button
                type="primary"
                onClick={() => setPendingModalVisible(true)}
                className="pending-applications-btn"
              >
                Pending Applications
              </Button>
            </Badge>
          </Space>
        </div>
      </div>
      <DashboardStats
        stats={stats}
        loading={loading}
        onShowUpcoming={() =>
          handleChartClick({ upcoming: true, sortBy: 'MaturityDate', sortDir: 'asc' }, 'Upcoming Payments: Accounts with Balance')
        }
      />
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
        api={api}
        loanRates={loanRates} // ✅ pass here
      />

      <PendingApplication
        visible={pendingModalVisible}
        onClose={() => setPendingModalVisible(false)}
        onCountChange={setPendingCount} // ✅ Add this prop
      />
      {/* New Details Modal */}
      {detailsModalVisible && (
        <ChartDetailsModal
          visible={detailsModalVisible}
          onClose={() => setDetailsModalVisible(false)}
          title={detailsModalTitle}
          filter={detailsModalFilter}
          onViewLoan={(record) => viewLoan(record)}
        />
      )}
    </div>
  );
}

export default Dashboard;
