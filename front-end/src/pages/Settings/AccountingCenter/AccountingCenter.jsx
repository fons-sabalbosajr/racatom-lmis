import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
  DatePicker,
  Spin,
  Table,
  Tooltip,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Button,
  Popconfirm,
  Tag,
  Space,
} from "antd";
import {
  DollarCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  FileTextOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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
import { swalMessage } from "../../../utils/swal";
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
  // Auto-generate remarks based on transaction data
  const generateRemarks = (record) => {
    const parts = [];
    if (record.CollectionPayment > 0) {
      parts.push(`Payment of ₱${Number(record.CollectionPayment).toLocaleString("en-US", { minimumFractionDigits: 2 })} received`);
    }
    if (record.AccountId) {
      parts.push(`for Account ${record.AccountId}`);
    }
    if (record.PaymentMode) {
      parts.push(`via ${record.PaymentMode}`);
    }
    if (record.CollectorName) {
      parts.push(`collected by ${record.CollectorName}`);
    }
    if (record.PrincipalPaid > 0 || record.CollectedInterest > 0) {
      const breakdown = [];
      if (record.PrincipalPaid > 0) breakdown.push(`Principal: ₱${Number(record.PrincipalPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      if (record.CollectedInterest > 0) breakdown.push(`Interest: ₱${Number(record.CollectedInterest).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      if (record.Penalty > 0) breakdown.push(`Penalty: ₱${Number(record.Penalty).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      parts.push(`(${breakdown.join(", ")})`);
    }
    if (record.CollectionReferenceNo) {
      parts.push(`Ref: ${record.CollectionReferenceNo}`);
    }
    // Use custom remarks if set, otherwise auto-generate
    if (record.Remarks) return record.Remarks;
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "PaymentDate",
      key: "date",
      render: (text) => dayjs(text).format("YYYY-MM-DD"),
      sorter: (a, b) =>
        dayjs(a.PaymentDate).unix() - dayjs(b.PaymentDate).unix(),
      defaultSortOrder: "descend",
      width: 110,
    },
    { title: "Account Id", dataIndex: "AccountId", key: "accountId", width: 110 },
    { title: "Client No", dataIndex: "ClientNo", key: "clientNo", width: 100 },
    { title: "Loan Cycle", dataIndex: "LoanCycleNo", key: "loanCycleNo", width: 100 },
    { title: "Collector", dataIndex: "CollectorName", key: "collector", width: 120 },
    { title: "Mode", dataIndex: "PaymentMode", key: "paymentMode", width: 100 },
    {
      title: "Amount",
      dataIndex: "CollectionPayment",
      key: "amount",
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.CollectionPayment - b.CollectionPayment,
      width: 120,
    },
    {
      title: "Remarks",
      key: "remarks",
      render: (_, rec) => (
        <Tooltip title={generateRemarks(rec)}>
          <span style={{
            display: "inline-block",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12,
            color: rec.Remarks ? "#1890ff" : "#666",
          }}>
            {generateRemarks(rec)}
          </span>
        </Tooltip>
      ),
      width: 240,
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

  // Accounting Terms Settings state
  const [acctTerms, setAcctTerms] = useState([]);
  const [acctTermsLoading, setAcctTermsLoading] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [termForm] = Form.useForm();

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
      swalMessage.error(
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

  // --- Accounting Terms functions ---
  const fetchAcctTerms = useCallback(async () => {
    setAcctTermsLoading(true);
    try {
      const res = await api.get("/accounting-terms");
      if (res.data?.success) setAcctTerms(res.data.data || []);
    } catch {
      // silent
    } finally {
      setAcctTermsLoading(false);
    }
  }, []);

  const handleSaveTerm = async (values) => {
    try {
      if (editingTerm) {
        const res = await api.put(`/accounting-terms/${editingTerm._id}`, values);
        if (res.data?.success) {
          swalMessage.success("Term updated");
          setAcctTerms((prev) => prev.map((t) => (t._id === editingTerm._id ? res.data.data : t)));
        }
      } else {
        const res = await api.post("/accounting-terms", values);
        if (res.data?.success) {
          swalMessage.success("Term added");
          setAcctTerms((prev) => [...prev, res.data.data]);
        }
      }
      setTermModalOpen(false);
      setEditingTerm(null);
      termForm.resetFields();
    } catch (err) {
      swalMessage.error(err?.response?.data?.message || "Failed to save term");
    }
  };

  const handleDeleteTerm = async (id) => {
    try {
      await api.delete(`/accounting-terms/${id}`);
      setAcctTerms((prev) => prev.filter((t) => t._id !== id));
      swalMessage.success("Term deleted");
    } catch {
      swalMessage.error("Failed to delete term");
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await api.post("/accounting-terms/seed-defaults");
      if (res.data?.success) {
        swalMessage.success(`Seeded ${res.data.data.inserted} default terms (${res.data.data.skipped} already existed)`);
        fetchAcctTerms();
      }
    } catch {
      swalMessage.error("Failed to seed defaults");
    }
  };

  const CATEGORY_COLORS = {
    Income: "green",
    Expense: "red",
    Asset: "blue",
    Liability: "orange",
    Equity: "purple",
    Other: "default",
  };

  const termColumns = [
    { title: "Code", dataIndex: "code", width: 120, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: "Name", dataIndex: "name", width: 200 },
    { title: "Description", dataIndex: "description", ellipsis: true },
    {
      title: "Category",
      dataIndex: "category",
      width: 120,
      render: (v) => <Tag color={CATEGORY_COLORS[v] || "default"}>{v}</Tag>,
      filters: ["Income", "Expense", "Asset", "Liability", "Equity", "Other"].map((c) => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 80,
      render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "Actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTerm(record);
              termForm.setFieldsValue(record);
              setTermModalOpen(true);
            }}
          />
          <Popconfirm title="Delete this term?" onConfirm={() => handleDeleteTerm(record._id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && allCollections.length === 0) {
    return (
      <Spin
        tip="Loading Accounting Center..."
        size="large"
        className="full-page-spin"
        spinning
      >
        <div style={{ minHeight: 200 }} />
      </Spin>
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
              Remarks: rec?.Remarks || "",
            });
            setDetailsOpen(true);
          }}
        />
      ),
    },
    {
      key: "3",
      label: (
        <span>
          <SettingOutlined /> Settings
        </span>
      ),
      children: (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Accounting Terms &amp; Codes</Title>
            <Space>
              <Button onClick={handleSeedDefaults}>Load Default Terms</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTerm(null);
                  termForm.resetFields();
                  setTermModalOpen(true);
                }}
              >
                Add Term
              </Button>
            </Space>
          </div>
          <Table
            dataSource={acctTerms}
            columns={termColumns}
            rowKey="_id"
            size="small"
            loading={acctTermsLoading}
            pagination={{ pageSize: 20 }}
          />
        </div>
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
                swalMessage.error(res.data?.message || "Failed to load all transactions");
              }
            } catch (e) {
              console.error("All transactions fetch failed:", e);
              swalMessage.error(
                e?.response?.data?.message || e?.message || "Failed to load all transactions"
              );
            } finally {
              setTxLoading(false);
            }
          }
          if (key === "3" && acctTerms.length === 0) {
            fetchAcctTerms();
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
              Remarks: vals.Remarks ?? selectedTx.Remarks ?? "",
            };
            const res = await api.put(`/loan-collections/${selectedTx._id}`, payload);
            if (res.data?.success) {
              swalMessage.success("Transaction updated");
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
              swalMessage.error(res.data?.message || "Update failed");
            }
          } catch (e) {
            console.error("Update failed", e);
            swalMessage.error(e?.response?.data?.message || e?.message || "Update failed");
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
          <Form.Item name="Remarks" label="Remarks">
            <Input.TextArea
              rows={3}
              placeholder="Add custom remarks for this transaction (optional — auto-generated if left empty)"
              showCount
              maxLength={500}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={detailsSaving}>
              {detailsSaving ? "Updating..." : "Update"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Accounting Term Modal */}
      <Modal
        title={editingTerm ? "Edit Accounting Term" : "Add Accounting Term"}
        open={termModalOpen}
        onCancel={() => {
          setTermModalOpen(false);
          setEditingTerm(null);
          termForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={termForm} layout="vertical" onFinish={handleSaveTerm}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="Code" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="e.g. INT-INC" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="e.g. Interest Income" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Brief description of this term" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="category" label="Category" initialValue="Other">
                <Select>
                  <Select.Option value="Income">Income</Select.Option>
                  <Select.Option value="Expense">Expense</Select.Option>
                  <Select.Option value="Asset">Asset</Select.Option>
                  <Select.Option value="Liability">Liability</Select.Option>
                  <Select.Option value="Equity">Equity</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sortOrder" label="Sort Order" initialValue={0}>
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          {editingTerm && (
            <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingTerm ? "Update" : "Add Term"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountingCenter;
