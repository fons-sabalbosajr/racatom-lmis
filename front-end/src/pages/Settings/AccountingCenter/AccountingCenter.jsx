import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Button,
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

const RecentTransactions = React.memo(({ transactions, loading, onOpen }) => {
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
    { title: "Account Id", dataIndex: "AccountId", key: "accountId" },
    { title: "Client No", dataIndex: "ClientNo", key: "clientNo" },
    { title: "Loan Cycle No", dataIndex: "LoanCycleNo", key: "loanCycleNo" },
    { title: "Collector", dataIndex: "CollectorName", key: "collector" },
    { title: "Payment Mode", dataIndex: "PaymentMode", key: "paymentMode" },
    {
      title: "Amount",
      dataIndex: "CollectionPayment",
      key: "amount",
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.CollectionPayment - b.CollectionPayment,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, rec) => (
        <Button size="small" onClick={() => onOpen && onOpen(rec)}>Details</Button>
      ),
      fixed: "right",
      width: 96,
    },
  ];

  return (
    <Card title="All Transactions" style={{ marginTop: 16 }}>
      <Table
        columns={columns}
        dataSource={transactions}
        loading={loading}
        rowKey={(r) => {
          // Prefer stringified _id; fallback to a composite key to guarantee uniqueness
          const id = r?._id && typeof r._id === "object" && typeof r._id.toString === "function" ? r._id.toString() : r?._id;
          const key = [
            id || "",
            r?.AccountId || "",
            r?.LoanCycleNo || "",
            r?.CollectionReferenceNo || "",
            r?.PaymentDate || "",
          ].join("|");
          return key || Math.random().toString(36).slice(2);
        }}
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
  // Transactions tab: load full dataset once on demand
  const [allTransactions, setAllTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("1");
  // Details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [detailsForm] = Form.useForm();
  const [pmodeOptions, setPmodeOptions] = useState([]);
  const [collectorOptions, setCollectorOptions] = useState([]);

  // Preload dropdown options for modal
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [pm, cn] = await Promise.all([
          api.get("/loan-collections/payment-modes"),
          api.get("/loan-collections/collector-names"),
        ]);
        if (pm.data?.success) setPmodeOptions((pm.data.data || []).filter(Boolean));
        if (cn.data?.success) setCollectorOptions((cn.data.data || []).filter(Boolean));
      } catch (e) {
        // non-blocking
      }
    };
    loadLookups();
  }, []);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, "days"),
    dayjs(),
  ]);

  // Fetch disbursed once (overall stat) and collections for the current range
  const fetchDisbursed = useCallback(async () => {
    try {
      const statsRes = await api.get("/dashboard/stats");
      const dashboardStats = statsRes.data?.data?.stats || {};
      setStats((prev) => ({
        ...prev,
        totalDisbursed: Number(dashboardStats.totalDisbursed || 0),
      }));
    } catch (e) {
      // Non-blocking; show a soft message
      console.warn("Dashboard stats fetch failed:", e?.message || e);
    }
  }, []);

  const fetchCollectionsForRange = useCallback(async (start, end) => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const params = {
        startDate: start.startOf("day").toDate().toISOString(),
        endDate: end.endOf("day").toDate().toISOString(),
        limit: 0, // fetch all within range in a single request
        sortBy: "PaymentDate",
        sortDir: "asc",
      };
      const res = await api.get("/loan-collections", { params });
      if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to load collections");

      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      setAllCollections(rows);
      setFilteredCollections(rows);

      // Aggregate stats from returned rows
      const sum = (arr, key) =>
        arr.reduce((acc, curr) => acc + Number(curr?.[key] || 0), 0);
      const totalCollected = sum(rows, "CollectionPayment");
      const totalPrincipal = sum(rows, "PrincipalPaid");
      const totalInterest = sum(rows, "CollectedInterest");
      setStats((prev) => ({
        ...prev,
        totalCollected,
        totalPrincipal,
        totalInterest,
      }));
    } catch (e) {
      console.error("Collections fetch failed:", e);
      message.error(
        e?.response?.data?.message || e?.message || "Failed to load collections"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisbursed();
    const [start, end] = dateRange;
    fetchCollectionsForRange(start, end);
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

  // Always show Transactions sorted by most recent date first
  const transactionsRows = useMemo(() => {
    const rows = allTransactions.length ? allTransactions : filteredCollections;
    return [...rows].sort(
      (a, b) => dayjs(b.PaymentDate).valueOf() - dayjs(a.PaymentDate).valueOf()
    );
  }, [allTransactions, filteredCollections]);

  if (loading && allCollections.length === 0) {
    return (
      <Spin
        tip="Loading Accounting Center..."
        size="large"
        className="full-page-spin"
      />
    );
  }

  // Build Tabs items for AntD v5
  const tabsItems = [
    {
      key: "1",
      label: (
        <span>
          <BarChartOutlined /> Overview
        </span>
      ),
      children: (
        <>
          <RangePicker
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              const [s, e] = range || [];
              if (s && e) fetchCollectionsForRange(s, e);
            }}
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
        </>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <FileTextOutlined /> Transactions
        </span>
      ),
      children: (
        <RecentTransactions
          transactions={transactionsRows}
          loading={txLoading || loading}
          onOpen={(rec) => {
            setSelectedTx(rec);
            detailsForm.setFieldsValue({
              PaymentDate: rec?.PaymentDate ? dayjs(rec.PaymentDate) : null,
              PaymentMode: rec?.PaymentMode || undefined,
              CollectorName: rec?.CollectorName || undefined,
              CollectionPayment: Number(rec?.CollectionPayment || 0),
              PrincipalPaid: Number(rec?.PrincipalPaid || 0),
              CollectedInterest: Number(rec?.CollectedInterest || 0),
              Penalty: Number(rec?.Penalty || 0),
              CollectionReferenceNo: rec?.CollectionReferenceNo || undefined,
              Bank: rec?.Bank || undefined,
              Branch: rec?.Branch || undefined,
              RunningBalance: Number(rec?.RunningBalance || 0),
            });
            setDetailsOpen(true);
          }}
        />
      ),
    },
  ];

  return (
    <div className="accounting-center-container">
      <Title level={2}>Accounting Center</Title>
      <Text type="secondary">
        Financial overview and reporting for your loan operations.
      </Text>

      <Tabs
        items={tabsItems}
        activeKey={activeTab}
        onChange={async (key) => {
          setActiveTab(key);
          if (key === "2" && allTransactions.length === 0) {
            try {
              setTxLoading(true);
              const res = await api.get("/loan-collections", {
                params: { limit: 0, sortBy: "PaymentDate", sortDir: "desc" },
              });
              if (res.data?.success) {
                setAllTransactions(Array.isArray(res.data.data) ? res.data.data : []);
              } else {
                message.error(res.data?.message || "Failed to load all transactions");
              }
            } catch (e) {
              console.error("All transactions fetch failed:", e);
              message.error(
                e?.response?.data?.message || e?.message || "Failed to load all transactions"
              );
            } finally {
              setTxLoading(false);
            }
          }
        }}
        style={{ marginTop: 20 }}
      />

      {/* Transaction Details Modal */}
      <Modal
        title={selectedTx ? `Transaction Details – ${selectedTx?.LoanCycleNo || ''}` : "Transaction Details"}
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={null}
      >
        {selectedTx && (
          <div style={{ marginBottom: 12, fontSize: 12, color: "#666" }}>
            <div>Date: {selectedTx.PaymentDate ? dayjs(selectedTx.PaymentDate).format("YYYY-MM-DD HH:mm") : "—"}</div>
            <div>Account: {selectedTx.AccountId || "—"}</div>
            <div>Client: {selectedTx.ClientNo || "—"}</div>
            <div>Collector: {selectedTx.CollectorName || "—"}</div>
            <div>Payment Mode: {selectedTx.PaymentMode || "—"}</div>
            <div>Total Paid: {formatCurrency(selectedTx.CollectionPayment)}</div>
          </div>
        )}
        <Form form={detailsForm} layout="vertical" onFinish={async (vals) => {
          if (!selectedTx?._id) return;
          try {
            setDetailsSaving(true);
            const payload = {
              PaymentDate: vals.PaymentDate ? vals.PaymentDate.toDate().toISOString() : selectedTx.PaymentDate,
              PaymentMode: vals.PaymentMode ?? selectedTx.PaymentMode,
              CollectorName: vals.CollectorName ?? selectedTx.CollectorName,
              CollectionPayment: Number((vals.CollectionPayment ?? selectedTx.CollectionPayment) || 0),
              PrincipalPaid: Number(vals.PrincipalPaid || 0),
              CollectedInterest: Number(vals.CollectedInterest || 0),
              Penalty: Number(vals.Penalty || 0),
              CollectionReferenceNo: vals.CollectionReferenceNo ?? selectedTx.CollectionReferenceNo,
              Bank: vals.Bank ?? selectedTx.Bank,
              Branch: vals.Branch ?? selectedTx.Branch,
              RunningBalance: Number((vals.RunningBalance ?? selectedTx.RunningBalance) || 0),
            };
            const res = await api.put(`/loan-collections/${selectedTx._id}`, payload);
            if (res.data?.success) {
              message.success("Transaction updated");
              const updated = { ...selectedTx, ...payload };
              setSelectedTx(updated);
              // Update in-memory arrays
              const applyUpdate = (arr) => arr.map((r) => (r._id === selectedTx._id ? { ...r, ...payload } : r));
              setAllTransactions((arr) => (arr && arr.length ? applyUpdate(arr) : arr));
              setAllCollections((arr) => applyUpdate(arr));
              setFilteredCollections((arr) => applyUpdate(arr));
              // Recompute stats based on filteredCollections
              const rows = applyUpdate(filteredCollections);
              const sum = (a, k) => a.reduce((acc, c) => acc + Number(c?.[k] || 0), 0);
              setStats((prev) => ({
                ...prev,
                totalCollected: sum(rows, "CollectionPayment"),
                totalPrincipal: sum(rows, "PrincipalPaid"),
                totalInterest: sum(rows, "CollectedInterest"),
              }));
              setDetailsOpen(false);
            } else {
              message.error(res.data?.message || "Update failed");
            }
          } catch (e) {
            console.error("Update failed", e);
            message.error(e?.response?.data?.message || e?.message || "Update failed");
          } finally {
            setDetailsSaving(false);
          }
        }}>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="PaymentDate" label="Payment Date">
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="PaymentMode" label="Payment Mode">
                <Select allowClear placeholder="Select mode">
                  {pmodeOptions.map((m) => (
                    <Select.Option key={m} value={m}>{m}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="CollectorName" label="Collector">
                <Select allowClear showSearch placeholder="Select collector">
                  {collectorOptions.map((c) => (
                    <Select.Option key={c} value={c}>{c}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="CollectionPayment" label="Amount Paid">
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} addonBefore="₱" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="PrincipalPaid" label="Principal (Paid)">
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} addonBefore="₱" />
          </Form.Item>
          <Form.Item name="CollectedInterest" label="Interest (Paid)">
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} addonBefore="₱" />
          </Form.Item>
          <Form.Item name="Penalty" label="Penalty">
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} addonBefore="₱" />
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="CollectionReferenceNo" label="Reference No.">
                <Input placeholder="e.g., OR# or Bank Ref" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="RunningBalance" label="Running Balance">
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} precision={2} addonBefore="₱" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="Bank" label="Bank">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="Branch" label="Branch">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={detailsSaving}>
              {detailsSaving ? "Updating..." : "Update"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountingCenter;
