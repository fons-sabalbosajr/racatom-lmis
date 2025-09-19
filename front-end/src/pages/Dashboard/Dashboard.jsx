import React, { useState, useEffect } from "react";
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
  const [allLoans, setAllLoans] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 5, total: 0, pageSizeOptions: ["5", "10", "20", "50"] });
  const [sort, setSort] = useState({ sortBy: "LoanStatus", sortDir: "asc" });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const viewLoan = async (record) => {
    setLoading(true);
    //console.log("Viewing loan record:", record);
    try {
      const loansRes = await api.get(`/loans/client/${record.clientNo}`);
      //console.log("Loans response:", loansRes.data);
      const docsRes = await api.get(
        `/loans/client/${record.clientNo}/documents`
      );
      //console.log("Documents response:", docsRes.data);

      if (loansRes.data.success && docsRes.data.success) {
        const currentLoan = loansRes.data.data.find(
          (loan) => loan._id === record._id
        );
        //console.log("Current loan found:", currentLoan);
        if (currentLoan) {
          setSelectedLoan({
            ...currentLoan,
            allClientLoans: loansRes.data.data,
            clientDocuments: docsRes.data.data,
          });
          // console.log("Selected loan set:", {
          //   ...currentLoan,
          //   allClientLoans: loansRes.data.data,
          //   clientDocuments: docsRes.data.data,
          // });
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

  const fetchAllLoansData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loans");
      if (res.data.success) {
        const loans = res.data.data;
        setAllLoans(loans);

        const totalLoans = loans.length;
        const totalDisbursed = loans.reduce(
          (acc, loan) =>
            acc + Number(String(loan.LoanAmount || 0).replace(/[₱,]/g, "")),
          0
        );
        const upcomingPayments = loans.filter(
          (loan) => new Date(loan.MaturityDate) > new Date()
        ).length;
        const totalLoanAmount = loans.reduce(
          (acc, loan) =>
            acc + Number(String(loan.LoanAmount || 0).replace(/[₱,]/g, "")),
          0
        );
        const averageLoanAmount =
          totalLoans > 0 ? totalLoanAmount / totalLoans : 0;

        setStats({
          totalLoans,
          totalDisbursed,
          upcomingPayments,
          averageLoanAmount,
        });

        const statusCounts = loans.reduce((acc, loan) => {
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

        const loanTypeCounts = loans.reduce((acc, loan) => {
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
        message.error("Failed to load all dashboard data");
      }
    } catch (err) {
      console.error(err);
      message.error("Error loading all dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLoans = async (page, limit, sortBy, sortDir, filters = {}) => {
    setLoading(true);
    try {
      const res = await api.get("/loans", {
        params: {
          page,
          limit,
          sortBy,
          sortDir,
          ...filters, // Spread the filters here
        },
      });
      if (res.data.success) {
        setRecentLoans(res.data.data);
        setMeta({
          page: Number(res.data.meta.page || 1),
          limit: Number(res.data.meta.limit || 5),
          total: Number(res.data.meta.total || 0),
          pageSizeOptions: ["5", "10", "20", "50"],
        });
        //console.log(`Total rows loaded: ${res.data.data.length}`);
      } else {
        message.error("Failed to load recent loans");
      }
    } catch (err) {
      console.error(err);
      message.error("Error loading recent loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLoansData();
    fetchRecentLoans(meta.page, meta.limit, sort.sortBy, sort.sortDir);
  }, []);

  const handleTableChange = (pagination, filters, sorter) => {
    let sortBy = sort.sortBy;
    let sortDir = sort.sortDir;

    if (sorter && sorter.field) {
      sortBy = sorter.field;
      sortDir = sorter.order === "ascend" ? "asc" : "desc";
    }

    setSort({ sortBy, sortDir });
    fetchRecentLoans(pagination.current, pagination.pageSize, sortBy, sortDir, filters);
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