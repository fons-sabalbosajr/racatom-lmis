import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
  DatePicker,
  message,
  Spin,
  Table,
  Tooltip,
} from "antd";
import {
  DollarCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import api from "../../../utils/axios";
import "./accountingCenter.css";

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// --- Helper Functions ---
const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// --- Child Components ---

const AccountingStats = React.memo(({ stats, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card className="stat-card">
        <Statistic
          title="Total Disbursed"
          value={stats.totalDisbursed}
          precision={2}
          prefix="₱"
          loading={loading}
          valueStyle={{ color: "#cf1322" }}
          icon={<FallOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card className="stat-card">
        <Statistic
          title="Total Collected"
          value={stats.totalCollected}
          precision={2}
          prefix="₱"
          loading={loading}
          valueStyle={{ color: "#3f8600" }}
          icon={<RiseOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card className="stat-card">
        <Statistic
          title="Total Principal Collected"
          value={stats.totalPrincipal}
          precision={2}
          prefix="₱"
          loading={loading}
          valueStyle={{ color: "#1890ff" }}
          icon={<DollarCircleOutlined />}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card className="stat-card">
        <Statistic
          title="Total Interest Collected"
          value={stats.totalInterest}
          precision={2}
          prefix="₱"
          loading={loading}
          valueStyle={{ color: "#faad14" }}
          icon={<PieChartOutlined />}
        />
      </Card>
    </Col>
  </Row>
));

const CollectionsChart = React.memo(({ data }) => (
  <Card title="Collections Over Time" style={{ marginTop: 16 }}>
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `₱${value / 1000}k`} />
        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#8884d8"
          fill="#8884d8"
          name="Collection Amount"
        />
      </AreaChart>
    </ResponsiveContainer>
  </Card>
));

const CollectionBreakdownChart = React.memo(({ data }) => {
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];
  return (
    <Card title="Collection Breakdown" style={{ marginTop: 16 }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <RechartsTooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
});

const RecentTransactions = React.memo(({ transactions, loading }) => {
  const columns = [
    {
      title: "Date",
      dataIndex: "PaymentDate",
      key: "date",
      render: (text) => dayjs(text).format("YYYY-MM-DD"),
      sorter: (a, b) =>
        dayjs(a.PaymentDate).unix() - dayjs(b.PaymentDate).unix(),
      defaultSortOrder: "descend",
    },
    { title: "Client No", dataIndex: "ClientNo", key: "clientNo" },
    { title: "Loan Cycle No", dataIndex: "LoanCycleNo", key: "loanCycleNo" },
    { title: "Collector", dataIndex: "CollectorName", key: "collector" },
    { title: "Payment Type", dataIndex: "PaymentType", key: "paymentType" },
    {
      title: "Amount",
      dataIndex: "CollectionPayment",
      key: "amount",
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.CollectionPayment - b.CollectionPayment,
    },
  ];

  return (
    <Card title="All Transactions" style={{ marginTop: 16 }}>
      <Table
        columns={columns}
        dataSource={transactions}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );
});

// --- Main Accounting Center Component ---

const AccountingCenter = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDisbursed: 0,
    totalCollected: 0,
    totalPrincipal: 0,
    totalInterest: 0,
  });
  const [allCollections, setAllCollections] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, "days"),
    dayjs(),
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const statsRes = await api.get("/dashboard/stats");
        const dashboardStats = statsRes.data.success
          ? statsRes.data.data.stats
          : {};

        const loansRes = await api.get("/loans", { params: { limit: 50000 } });
        if (!loansRes.data.success) {
          throw new Error("Could not fetch loan list.");
        }
        const loans = loansRes.data.data;

        const collectionPromises = loans
          .filter((loan) => loan.loanInfo && loan.loanInfo.loanNo)
          .map((loan) =>
            api.get(`/loan-collections/${loan.loanInfo.loanNo}`, {
              params: { limit: 50000 },
            })
          );

        const collectionResults = await Promise.all(collectionPromises);
        const allCollectionsData = collectionResults.flatMap((res) =>
          res.data.success ? res.data.data : []
        );

        setAllCollections(allCollectionsData);

        const totalCollected = allCollectionsData.reduce(
          (acc, curr) => acc + parseFloat(curr.CollectionPayment || 0),
          0
        );
        // Correctly sum PrincipalPaid and InterestPaid
        const totalPrincipal = allCollectionsData.reduce(
          (acc, curr) => acc + parseFloat(curr.PrincipalPaid || 0),
          0
        );
        const totalInterest = allCollectionsData.reduce(
          (acc, curr) => acc + parseFloat(curr.CollectedInterest || 0),
          0
        );

        setStats({
          totalDisbursed: dashboardStats.totalDisbursed || 0,
          totalCollected,
          totalPrincipal,
          totalInterest,
        });
      } catch (error) {
        console.error("Failed to fetch accounting data:", error);
        message.error("Failed to fetch accounting data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (dateRange && allCollections.length > 0) {
      const [start, end] = dateRange;
      if (start && end) {
        const filtered = allCollections.filter((c) =>
          dayjs(c.PaymentDate).isBetween(start, end, null, "[]")
        );
        setFilteredCollections(filtered);
      } else {
        setFilteredCollections(allCollections);
      }
    } else {
      setFilteredCollections(allCollections);
    }
  }, [dateRange, allCollections]);

  const collectionsOverTimeData = useMemo(() => {
    const groupedByDate = filteredCollections.reduce((acc, curr) => {
      const date = dayjs(curr.PaymentDate).format("YYYY-MM-DD");
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(curr.CollectionPayment || 0);
      return acc;
    }, {});

    return Object.entries(groupedByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
  }, [filteredCollections]);

  const breakdownData = useMemo(() => {
    const principal = filteredCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.PrincipalPaid || 0),
      0
    );
    const interest = filteredCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.CollectedInterest || 0),
      0
    );
    const penalty = filteredCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.Penalty || 0),
      0
    );

    return [
      { name: "Principal", value: principal },
      { name: "Interest", value: interest },
      { name: "Penalty", value: penalty },
    ].filter((item) => item.value > 0);
  }, [filteredCollections]);

  if (loading && allCollections.length === 0) {
    return (
      <Spin
        tip="Loading Accounting Center..."
        size="large"
        className="full-page-spin"
      />
    );
  }

  return (
    <div className="accounting-center-container">
      <Title level={2}>Accounting Center</Title>
      <Text type="secondary">
        Financial overview and reporting for your loan operations.
      </Text>

      <Tabs defaultActiveKey="1" style={{ marginTop: 20 }}>
        <TabPane
          tab={
            <span>
              <BarChartOutlined /> Overview
            </span>
          }
          key="1"
        >
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ marginBottom: 16 }}
            allowClear
          />
          <AccountingStats stats={stats} loading={loading} />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <CollectionsChart data={collectionsOverTimeData} />
            </Col>
            <Col xs={24} lg={8}>
              <CollectionBreakdownChart data={breakdownData} />
            </Col>
          </Row>
        </TabPane>
        <TabPane
          tab={
            <span>
              <FileTextOutlined /> Transactions
            </span>
          }
          key="2"
        >
          <RecentTransactions transactions={allCollections} loading={loading} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AccountingCenter;
