import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Table,
  Button,
  Input,
  Card,
  Tag,
  Space,
  Modal,
  Descriptions,
  DatePicker,
  Typography,
  Divider,
  Select,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  PrinterOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import "../soa.css";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCache, setCache } from "../../../utils/simpleCache";
import { swalMessage } from "../../../utils/swal";

const { Search } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS = {
  UPDATED: "green",
  ARREARS: "orange",
  "PAST DUE": "red",
  LITIGATION: "volcano",
  DORMANT: "grey",
  CLOSED: "default",
  Approved: "blue",
  Released: "purple",
  "Loan Released": "purple",
  ACTIVE: "cyan",
};

const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(/[^0-9.-]/g, "")) || 0;
  if (v?.$numberDecimal) return parseFloat(v.$numberDecimal) || 0;
  try { return Number(v.toString()) || 0; } catch { return 0; }
};

const AccountVouchers = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [localSearch, setLocalSearch] = useState("");
  const searchDebounceRef = useRef(null);

  // Voucher preview state
  const [voucherVisible, setVoucherVisible] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherRecord, setVoucherRecord] = useState(null);
  const [voucherCollections, setVoucherCollections] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [voucherType, setVoucherType] = useState("disbursement");

  const fetchLoans = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, q: filters.search, minimal: true };
      const cacheKey = `voucher:loans:${params.page}:${params.limit}:${(params.q || "").trim()}`;
      const cached = getCache(cacheKey);
      if (cached) {
        setLoans(cached.data || []);
        setPagination(cached.meta || { current: page, pageSize, total: 0 });
      }
      const response = await api.get("/loans", { params });
      if (response.data.success) {
        const data = Array.isArray(response.data.data) ? response.data.data : [];
        const meta = response.data.meta || { page, limit: pageSize, total: data.length };
        setLoans(data);
        setPagination({ current: meta.page, pageSize: meta.limit, total: meta.total });
        setCache(cacheKey, { data, meta, total: meta.total }, 5 * 60 * 1000);
      } else {
        swalMessage.error("Failed to fetch loan accounts");
      }
    } catch (error) {
      swalMessage.error("An error occurred while fetching loan accounts");
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLoans(); }, [filters]);

  const handleTableChange = (pag) => { fetchLoans(pag.current, pag.pageSize); };

  // Open voucher generation modal
  const openVoucher = async (record) => {
    setVoucherRecord(record);
    setVoucherVisible(true);
    setVoucherLoading(true);
    setVoucherCollections([]);
    setDateRange(null);
    setVoucherType("disbursement");
    try {
      const res = await api.get("/loan-collections", {
        params: {
          limit: 0,
          minimal: 1,
          loanCycleNo: record.loanInfo.loanNo,
          accountId: record.accountId || record.AccountId,
          clientNo: record.loanInfo?.clientNo || record.ClientNo,
        },
        timeout: 60000,
      });
      if (res.data?.success) {
        setVoucherCollections(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (e) {
      console.error(e);
      swalMessage.error("Failed to fetch collection data");
    } finally {
      setVoucherLoading(false);
    }
  };

  // Compute voucher data
  const voucherData = useMemo(() => {
    if (!voucherRecord) return null;
    let filtered = voucherCollections;
    if (dateRange?.[0] && dateRange?.[1]) {
      const start = dateRange[0].startOf("day");
      const end = dateRange[1].endOf("day");
      filtered = voucherCollections.filter((c) => {
        const d = dayjs(c.PaymentDate);
        return d.isAfter(start) && d.isBefore(end);
      });
    }
    const totalPayments = filtered.reduce((s, c) => s + toNum(c.CollectionPayment), 0);
    const totalPrincipal = filtered.reduce((s, c) => s + toNum(c.PrincipalPaid || c.AmortizationPrincipal), 0);
    const totalInterest = filtered.reduce((s, c) => s + toNum(c.InterestPaid || c.AmortizationInterest), 0);
    const totalPenalty = filtered.reduce((s, c) => s + toNum(c.Penalty), 0);
    const lastBalance = filtered.length > 0 ? toNum(filtered[filtered.length - 1].RunningBalance) : toNum(voucherRecord.loanInfo?.balance);

    return {
      collections: filtered,
      totalPayments,
      totalPrincipal,
      totalInterest,
      totalPenalty,
      lastBalance,
      loanAmount: voucherRecord.loanInfo?.amount || 0,
      clientName: voucherRecord.fullName || `${voucherRecord.person?.firstName || ""} ${voucherRecord.person?.lastName || ""}`,
      accountId: voucherRecord.accountId,
      loanNo: voucherRecord.loanInfo?.loanNo,
      loanType: voucherRecord.loanInfo?.type,
      status: voucherRecord.loanInfo?.status,
      paymentMode: voucherRecord.loanInfo?.paymentMode,
      collector: voucherRecord.loanInfo?.collectorName,
      address: [voucherRecord.address?.barangay, voucherRecord.address?.city, voucherRecord.address?.province].filter(Boolean).join(", "),
    };
  }, [voucherRecord, voucherCollections, dateRange]);

  // Generate voucher PDF
  const generateVoucherPDF = () => {
    if (!voucherData || !voucherRecord) return;
    const doc = new jsPDF("p", "mm", "a4");
    const now = dayjs();
    const voucherNo = `AV-${voucherData.accountId}-${now.format("YYYYMMDDHHmm")}`;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("RACATOM LENDING - ACCOUNT VOUCHER", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Voucher No: ${voucherNo}`, 14, 25);
    doc.text(`Date Generated: ${now.format("MM/DD/YYYY hh:mm A")}`, 14, 30);
    doc.text(`Voucher Type: ${voucherType === "disbursement" ? "Loan Disbursement" : voucherType === "collection" ? "Payment Collection" : "Account Summary"}`, 14, 35);
    if (dateRange?.[0] && dateRange?.[1]) {
      doc.text(`Period: ${dateRange[0].format("MM/DD/YYYY")} - ${dateRange[1].format("MM/DD/YYYY")}`, 130, 25);
    }

    // Borrower info
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("BORROWER INFORMATION", 14, 45);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    const info = [
      [`Name: ${voucherData.clientName}`, `Account ID: ${voucherData.accountId}`],
      [`Loan No: ${voucherData.loanNo}`, `Loan Type: ${voucherData.loanType || "N/A"}`],
      [`Address: ${voucherData.address || "N/A"}`, `Collector: ${voucherData.collector || "N/A"}`],
      [`Status: ${voucherData.status || "N/A"}`, `Payment Mode: ${voucherData.paymentMode || "N/A"}`],
    ];
    let y = 50;
    info.forEach(([left, right]) => { doc.text(left, 14, y); doc.text(right, 120, y); y += 5; });

    // Financial summary table
    y += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("FINANCIAL SUMMARY", 14, y);
    y += 5;

    const fmtAmt = (n) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    autoTable(doc, {
      startY: y,
      head: [["Description", "Amount"]],
      body: [
        ["Loan Amount (Principal)", fmtAmt(voucherData.loanAmount)],
        ["Total Collections Received", fmtAmt(voucherData.totalPayments)],
        ["Principal Paid", fmtAmt(voucherData.totalPrincipal)],
        ["Interest Paid", fmtAmt(voucherData.totalInterest)],
        ["Penalties", fmtAmt(voucherData.totalPenalty)],
        ["Outstanding Balance", fmtAmt(voucherData.lastBalance)],
      ],
      theme: "grid",
      headStyles: { fillColor: [114, 46, 209], textColor: 255, fontSize: 10, fontStyle: "bold" },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } },
      styles: { cellPadding: 3 },
    });

    // Payment transactions
    if (voucherData.collections.length > 0) {
      const tableY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("PAYMENT TRANSACTIONS", 14, tableY);
      autoTable(doc, {
        startY: tableY + 5,
        head: [["#", "Date", "Reference No", "Payment", "Balance", "Collector"]],
        body: voucherData.collections.map((c, i) => [
          i + 1,
          c.PaymentDate ? dayjs(c.PaymentDate).format("MM/DD/YYYY") : "",
          c.CollectionReferenceNo || "",
          fmtAmt(toNum(c.CollectionPayment)),
          fmtAmt(toNum(c.RunningBalance)),
          c.CollectorName || "",
        ]),
        theme: "grid",
        headStyles: { fillColor: [114, 46, 209], textColor: 255, fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "right" }, 4: { halign: "right" } },
        styles: { cellPadding: 2, halign: "center" },
      });
    }

    // Signature lines
    const footerY = doc.internal.pageSize.height - 30;
    doc.setDrawColor(150);
    doc.line(14, footerY, 90, footerY);
    doc.line(120, footerY, 196, footerY);
    doc.setFontSize(9);
    doc.text("Prepared By", 42, footerY + 5, { align: "center" });
    doc.text("Approved By", 158, footerY + 5, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Generated by RACATOM-LMIS | ${now.format("MM/DD/YYYY hh:mm A")}`, 105, doc.internal.pageSize.height - 10, { align: "center" });

    doc.save(`AccountVoucher-${voucherNo}.pdf`);
    swalMessage.success("Account Voucher PDF generated!");
    setVoucherVisible(false);
  };

  const columns = [
    {
      title: "Account / Loan No",
      key: "loanNo",
      sorter: (a, b) => (a.accountId || "").localeCompare(b.accountId || ""),
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.accountId}</div>
          <div style={{ fontSize: 12, color: "gray" }}>{r.loanInfo?.loanNo}</div>
        </div>
      ),
    },
    {
      title: "Client Name",
      key: "name",
      sorter: (a, b) => (a.fullName || "").localeCompare(b.fullName || ""),
      render: (_, r) => <Text strong>{r.fullName || `${r.person?.firstName || ""} ${r.person?.lastName || ""}`}</Text>,
    },
    {
      title: "Loan Amount",
      key: "amount",
      align: "right",
      render: (_, r) => <Text>₱{(r.loanInfo?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
    },
    {
      title: "Balance",
      key: "balance",
      align: "right",
      render: (_, r) => (
        <Text type={r.loanInfo?.balance > 0 ? "danger" : "success"}>
          ₱{(r.loanInfo?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) => <Tag color={STATUS_COLORS[r.loanInfo?.status] || "default"}>{r.loanInfo?.status || "Unknown"}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (_, r) => (
        <Button type="primary" size="small" icon={<FilePdfOutlined />} onClick={() => openVoucher(r)}>
          Generate Voucher
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Account Vouchers</Title>}
        extra={
          <Space>
            <Search
              placeholder="Search by name, account ID..."
              allowClear
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = setTimeout(() => setFilters({ search: e.target.value }), 400);
              }}
              onSearch={(val) => setFilters({ search: val })}
              style={{ width: 280 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetchLoans(pagination.current, pagination.pageSize)}>Refresh</Button>
          </Space>
        }
      >
        <Table
          dataSource={loans}
          columns={columns}
          rowKey={(r) => r._id || r.accountId}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total) => `Total ${total} accounts`,
          }}
          onChange={handleTableChange}
          size="small"
        />
      </Card>

      {/* Voucher Generation Modal */}
      <Modal
        title="Generate Account Voucher"
        open={voucherVisible}
        onCancel={() => { setVoucherVisible(false); setVoucherRecord(null); }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setVoucherVisible(false)}>Cancel</Button>,
          <Button key="gen" type="primary" icon={<PrinterOutlined />} onClick={generateVoucherPDF} loading={voucherLoading} disabled={!voucherData}>
            Generate PDF
          </Button>,
        ]}
        destroyOnHidden
      >
        {voucherRecord && voucherData && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>Voucher Type:</Text>
                <Select
                  value={voucherType}
                  onChange={setVoucherType}
                  style={{ width: "100%", marginTop: 4 }}
                  options={[
                    { label: "Loan Disbursement", value: "disbursement" },
                    { label: "Payment Collection", value: "collection" },
                    { label: "Account Summary", value: "summary" },
                  ]}
                />
              </Col>
              <Col span={12}>
                <Text strong>Date Range (Optional):</Text>
                <RangePicker style={{ width: "100%", marginTop: 4 }} value={dateRange} onChange={setDateRange} format="MM/DD/YYYY" />
              </Col>
            </Row>
            <Divider />
            <Descriptions bordered size="small" column={2} title="Borrower Information">
              <Descriptions.Item label="Client Name">{voucherData.clientName}</Descriptions.Item>
              <Descriptions.Item label="Account ID">{voucherData.accountId}</Descriptions.Item>
              <Descriptions.Item label="Loan No">{voucherData.loanNo}</Descriptions.Item>
              <Descriptions.Item label="Loan Type">{voucherData.loanType || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[voucherData.status] || "default"}>{voucherData.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Payment Mode">{voucherData.paymentMode || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Collector" span={2}>{voucherData.collector || "N/A"}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Title level={5}>Financial Summary</Title>
            <Row gutter={16}>
              <Col span={8}><Statistic title="Loan Amount" value={voucherData.loanAmount} prefix="₱" precision={2} /></Col>
              <Col span={8}><Statistic title="Total Collected" value={voucherData.totalPayments} prefix="₱" precision={2} /></Col>
              <Col span={8}><Statistic title="Outstanding Balance" value={voucherData.lastBalance} prefix="₱" precision={2} valueStyle={{ color: voucherData.lastBalance > 0 ? "#cf1322" : "#3f8600" }} /></Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={8}><Statistic title="Principal Paid" value={voucherData.totalPrincipal} prefix="₱" precision={2} /></Col>
              <Col span={8}><Statistic title="Interest Paid" value={voucherData.totalInterest} prefix="₱" precision={2} /></Col>
              <Col span={8}><Statistic title="Total Penalties" value={voucherData.totalPenalty} prefix="₱" precision={2} /></Col>
            </Row>
            <Divider />
            <Title level={5}>Payment Transactions ({voucherData.collections.length})</Title>
            <Table
              dataSource={voucherData.collections}
              size="small"
              pagination={{ pageSize: 5 }}
              rowKey={(r) => r._id || r.CollectionReferenceNo || Math.random().toString(36)}
              columns={[
                { title: "#", render: (_, __, i) => i + 1, width: 40 },
                { title: "Date", dataIndex: "PaymentDate", render: (v) => v ? dayjs(v).format("MM/DD/YYYY") : "" },
                { title: "Ref No", dataIndex: "CollectionReferenceNo" },
                { title: "Payment", dataIndex: "CollectionPayment", align: "right", render: (v) => `₱${toNum(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                { title: "Balance", dataIndex: "RunningBalance", align: "right", render: (v) => `₱${toNum(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                { title: "Collector", dataIndex: "CollectorName" },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccountVouchers;