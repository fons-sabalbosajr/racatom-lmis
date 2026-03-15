import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  Button,
  Input,
  Card,
  Tag,
  Space,
  Modal,
  Typography,
  Divider,
  Select,
  DatePicker,
  Descriptions,
  Row,
  Col,
  Checkbox,
  Image,
  Tooltip,
  Spin,
} from "antd";
import {
  PrinterOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  UndoOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCache, setCache } from "../../../utils/simpleCache";
import { swalMessage } from "../../../utils/swal";

const { Search, TextArea } = Input;
const { Title, Text } = Typography;

const STATUS_COLORS = {
  UPDATED: "green",
  ARREARS: "orange",
  "PAST DUE": "red",
  LITIGATION: "volcano",
  DORMANT: "grey",
  CLOSED: "default",
};

const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "object" && v.$numberDecimal) return parseFloat(v.$numberDecimal);
  return parseFloat(v) || 0;
};

const fmtCurrency = (v) =>
  `₱${toNum(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const OVERDUE_STATUSES = ["ARREARS", "PAST DUE", "LITIGATION", "DORMANT"];

const LETTER_TYPES = [
  { value: "demand", label: "Demand Letter" },
  { value: "final_demand", label: "Final Demand Letter" },
  { value: "notice", label: "Notice of Delinquency" },
];

const DemandLetter = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [letterType, setLetterType] = useState("demand");
  const [letterDate, setLetterDate] = useState(dayjs());
  const [complianceDate, setComplianceDate] = useState(dayjs().add(7, "day"));
  const [loanClients, setLoanClients] = useState([]);
  // Editable letter content
  const [editableTitle, setEditableTitle] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  // Client documents (ID images etc.)
  const [clientDocs, setClientDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // ─── Fetch overdue loans ────────────────────────────────────
  const fetchOverdueLoans = async () => {
    setLoading(true);
    try {
      const cached = getCache("demand_letter_loans");
      if (cached) {
        setLoans(cached.loans || []);
        setLoanClients(cached.clients || []);
        setLoading(false);
        return;
      }

      const loansRes = await api.get("/loans");
      const allLoans = Array.isArray(loansRes.data) ? loansRes.data : loansRes.data?.data || [];

      // Filter only overdue loans
      const overdue = allLoans.filter(
        (l) =>
          OVERDUE_STATUSES.includes(l.LoanStatus) &&
          l.LoanProcessStatus !== "Pending"
      );

      // Derive client data from the loan records (person / address fields)
      const derivedClients = allLoans.map((l) => ({
        AccountId: l.AccountId,
        FirstName: l.person?.firstName || l.fullName?.split(" ")[0] || "",
        MiddleName: l.person?.middleName || "",
        LastName: l.person?.lastName || "",
        NameSuffix: "",
        CurrentAddress: [l.address?.barangay, l.address?.city, l.address?.province]
          .filter(Boolean)
          .join(", ") || "N/A",
      }));

      setLoans(overdue);
      setLoanClients(derivedClients);
      setCache("demand_letter_loans", { loans: overdue, clients: derivedClients }, 120);
    } catch (err) {
      swalMessage.error("Failed to fetch overdue loans");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueLoans();
  }, []);

  // ─── Map client info by AccountId ──────────────────────────
  const clientMap = useMemo(() => {
    const map = {};
    for (const c of loanClients) {
      map[c.AccountId] = c;
    }
    return map;
  }, [loanClients]);

  // ─── Filtered loans ────────────────────────────────────────
  const filteredLoans = useMemo(() => {
    if (!searchText) return loans;
    const lower = searchText.toLowerCase();
    return loans.filter((l) => {
      const client = clientMap[l.AccountId];
      const fullName = client
        ? `${client.FirstName || ""} ${client.MiddleName || ""} ${client.LastName || ""}`.toLowerCase()
        : "";
      return (
        (l.AccountId || "").toLowerCase().includes(lower) ||
        (l.LoanCycleNo || "").toLowerCase().includes(lower) ||
        fullName.includes(lower) ||
        (l.LoanStatus || "").toLowerCase().includes(lower)
      );
    });
  }, [loans, searchText, clientMap]);

  // ─── Table columns ─────────────────────────────────────────
  const columns = [
    {
      title: "Account ID",
      dataIndex: "AccountId",
      width: 120,
    },
    {
      title: "Borrower Name",
      render: (_, record) => {
        const c = clientMap[record.AccountId];
        return c
          ? `${c.LastName || ""}, ${c.FirstName || ""} ${c.MiddleName || ""}`
          : record.AccountId;
      },
    },
    {
      title: "Loan Cycle",
      dataIndex: "LoanCycleNo",
      width: 130,
    },
    {
      title: "Loan Amount",
      render: (_, r) => fmtCurrency(r.LoanAmount),
      width: 130,
      align: "right",
    },
    {
      title: "Balance",
      render: (_, r) => fmtCurrency(r.LoanBalance),
      width: 130,
      align: "right",
    },
    {
      title: "Status",
      dataIndex: "LoanStatus",
      width: 110,
      render: (val) => <Tag color={STATUS_COLORS[val] || "default"}>{val}</Tag>,
      filters: OVERDUE_STATUSES.map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => record.LoanStatus === value,
    },
    {
      title: "Maturity Date",
      render: (_, r) =>
        r.MaturityDate ? dayjs(r.MaturityDate).format("MM/DD/YYYY") : "N/A",
      width: 120,
    },
    {
      title: "Action",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<FilePdfOutlined />}
            onClick={() => {
              setSelectedLoan(record);
              setPreviewVisible(true);
              const client = clientMap[record.AccountId];
              const letter = getLetterContent(record, client);
              setEditableTitle(letter.title);
              setEditableBody(letter.body.join("\n"));
              setIsEditing(false);
              setSelectedDocIds([]);
              fetchClientDocs(record.AccountId);
            }}
          >
            Generate
          </Button>
        </Space>
      ),
    },
  ];

  // ─── Build letter content ──────────────────────────────────
  const getLetterContent = (loan, client) => {
    const borrowerName = client
      ? [client.FirstName, client.MiddleName, client.LastName, client.NameSuffix]
          .filter(Boolean)
          .join(" ")
      : loan.AccountId;
    const borrowerAddress = client?.CurrentAddress || "N/A";
    const balance = fmtCurrency(loan.LoanBalance);
    const loanAmount = fmtCurrency(loan.LoanAmount);
    const dateFmt = letterDate.format("MMMM D, YYYY");
    const complianceFmt = complianceDate.format("MMMM D, YYYY");
    const maturity = loan.MaturityDate
      ? dayjs(loan.MaturityDate).format("MMMM D, YYYY")
      : "N/A";

    if (letterType === "demand") {
      return {
        title: "DEMAND LETTER",
        body: [
          `Date: ${dateFmt}`,
          "",
          `${borrowerName}`,
          `${borrowerAddress}`,
          "",
          `Dear ${client?.FirstName || "Borrower"},`,
          "",
          `This is to formally demand payment of your outstanding loan obligation with RACATOM Lending.`,
          "",
          `Your loan account (Loan Cycle No: ${loan.LoanCycleNo}) with an original amount of ${loanAmount} has a remaining balance of ${balance}. The maturity date was ${maturity} and your account is currently tagged as "${loan.LoanStatus}".`,
          "",
          `We hereby demand that you settle your outstanding balance on or before ${complianceFmt}. Failure to comply may result in the imposition of additional penalties and/or legal action.`,
          "",
          `Please make payment arrangements at the earliest possible time to avoid further costs.`,
          "",
          `Should you have any questions or wish to discuss a payment plan, please do not hesitate to contact us.`,
          "",
          `Thank you for your immediate attention to this matter.`,
        ],
      };
    }

    if (letterType === "final_demand") {
      return {
        title: "FINAL DEMAND LETTER",
        body: [
          `Date: ${dateFmt}`,
          "",
          `${borrowerName}`,
          `${borrowerAddress}`,
          "",
          `Dear ${client?.FirstName || "Borrower"},`,
          "",
          `Despite our previous demand letter, we note that your loan account remains unpaid.`,
          "",
          `Your loan account (Loan Cycle No: ${loan.LoanCycleNo}) has an outstanding balance of ${balance}. Your account is currently classified as "${loan.LoanStatus}".`,
          "",
          `This serves as our FINAL DEMAND for the immediate and full payment of the above-mentioned amount. If payment or satisfactory arrangements are not made on or before ${complianceFmt}, we shall be constrained to pursue all available legal remedies without further notice.`,
          "",
          `We strongly urge you to settle this obligation to avoid legal proceedings which will entail additional costs on your part.`,
          "",
          `We trust that this matter will receive your immediate attention.`,
        ],
      };
    }

    // notice
    return {
      title: "NOTICE OF DELINQUENCY",
      body: [
        `Date: ${dateFmt}`,
        "",
        `${borrowerName}`,
        `${borrowerAddress}`,
        "",
        `Dear ${client?.FirstName || "Borrower"},`,
        "",
        `This is to inform you that your loan account with us is currently delinquent.`,
        "",
        `Loan Cycle No: ${loan.LoanCycleNo}`,
        `Original Loan Amount: ${loanAmount}`,
        `Outstanding Balance: ${balance}`,
        `Maturity Date: ${maturity}`,
        `Current Status: ${loan.LoanStatus}`,
        "",
        `We encourage you to update your payments at the earliest opportunity. Continued delinquency may affect your loan standing and eligibility for future transactions.`,
        "",
        `Please visit or contact our office to discuss payment arrangements.`,
        "",
        `Thank you for your cooperation.`,
      ],
    };
  };

  // ─── Initialize editable content from template ─────────────
  const initEditableContent = useCallback((loan, client) => {
    const letter = getLetterContent(loan, client);
    setEditableTitle(letter.title);
    setEditableBody(letter.body.join("\n"));
    setIsEditing(false);
    setSelectedDocIds([]);
  }, [letterType, letterDate, complianceDate]);

  // ─── Fetch client documents (ID images etc.) ──────────────
  const fetchClientDocs = async (accountId) => {
    setLoadingDocs(true);
    try {
      const res = await api.get(`/loans/account/${accountId}/documents`);
      const docs = res.data?.data || res.data || [];
      // Only include image types
      const images = docs.filter(
        (d) => d.type === "image" || (d.mimeType && d.mimeType.startsWith("image/"))
      );
      setClientDocs(images);
    } catch {
      setClientDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // ─── Reset editable content when letter type/dates change ─
  useEffect(() => {
    if (selectedLoan && previewVisible) {
      const client = clientMap[selectedLoan.AccountId];
      initEditableContent(selectedLoan, client);
    }
  }, [letterType, letterDate, complianceDate]);

  // ─── Load image as base64 for PDF embedding ───────────────
  const loadImageAsBase64 = (src) =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });

  // ─── Generate PDF ──────────────────────────────────────────
  const generatePDF = async () => {
    if (!selectedLoan) return;

    const client = clientMap[selectedLoan.AccountId];
    const bodyLines = editableBody.split("\n");
    const title = editableTitle;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    const maxWidth = pageWidth - margin * 2;
    let y = 30;

    // Header
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("RACATOM Lending", pageWidth / 2, y, {
      align: "center",
    });
    y += 8;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0);
    doc.text(title, pageWidth / 2, y, { align: "center" });
    y += 5;

    // Decorative line
    doc.setDrawColor(0, 51, 153);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Body
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.setTextColor(30);

    for (const line of bodyLines) {
      if (line === "") {
        y += 5;
        continue;
      }
      const wrapped = doc.splitTextToSize(line, maxWidth);
      for (const wl of wrapped) {
        if (y > 265) {
          doc.addPage();
          y = 25;
        }
        doc.text(wl, margin, y);
        y += 6;
      }
    }

    // Loan summary table
    y += 8;
    if (y > 220) {
      doc.addPage();
      y = 25;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Detail", "Value"]],
      body: [
        ["Account ID", selectedLoan.AccountId],
        ["Loan Cycle No", selectedLoan.LoanCycleNo],
        ["Loan Amount", fmtCurrency(selectedLoan.LoanAmount)],
        ["Outstanding Balance", fmtCurrency(selectedLoan.LoanBalance)],
        ["Payment Mode", selectedLoan.PaymentMode || "N/A"],
        ["Loan Status", selectedLoan.LoanStatus],
        [
          "Maturity Date",
          selectedLoan.MaturityDate
            ? dayjs(selectedLoan.MaturityDate).format("MMMM D, YYYY")
            : "N/A",
        ],
      ],
      headStyles: {
        fillColor: [0, 51, 153],
        textColor: 255,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: "grid",
    });

    y = doc.lastAutoTable.finalY + 20;
    if (y > 240) {
      doc.addPage();
      y = 25;
    }

    // Signature section
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text("Respectfully,", margin, y);
    y += 25;

    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(margin, y, margin + 60, y);
    y += 5;
    doc.setFont(undefined, "bold");
    doc.text("Authorized Representative", margin, y);
    y += 15;

    // Received by section
    doc.setFont(undefined, "normal");
    doc.text("Received by:", margin, y);
    y += 20;
    doc.line(margin, y, margin + 60, y);
    y += 5;
    doc.setFont(undefined, "bold");
    doc.text("Borrower's Signature over Printed Name", margin, y);
    y += 6;
    doc.setFont(undefined, "normal");
    doc.text("Date: ___________________", margin, y);

    // ─── Attached client document images ────────────────────
    const selectedImages = clientDocs.filter((d) => selectedDocIds.includes(d._id));
    for (const imgDoc of selectedImages) {
      const imgSrc = imgDoc.url || imgDoc.link;
      if (!imgSrc) continue;
      const base64 = await loadImageAsBase64(imgSrc);
      if (!base64) continue;
      doc.addPage();
      y = 25;
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text(`Attachment: ${imgDoc.name}`, margin, y);
      y += 8;
      try {
        const imgProps = doc.getImageProperties(base64);
        const ratio = imgProps.width / imgProps.height;
        let imgW = maxWidth;
        let imgH = imgW / ratio;
        if (imgH > 220) {
          imgH = 220;
          imgW = imgH * ratio;
        }
        doc.addImage(base64, "JPEG", margin, y, imgW, imgH);
      } catch {
        doc.setFont(undefined, "normal");
        doc.text("[Could not embed image]", margin, y);
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated on ${dayjs().format("MM/DD/YYYY hh:mm A")} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const borrowerName = client
      ? `${client.LastName}_${client.FirstName}`
      : selectedLoan.AccountId;
    doc.save(`${title.replace(/\s/g, "_")}_${borrowerName}_${letterDate.format("YYYYMMDD")}.pdf`);
    swalMessage.success("PDF generated successfully!");
  };

  // ─── Preview & Edit content ────────────────────────────────
  const renderPreview = () => {
    if (!selectedLoan) return null;
    const client = clientMap[selectedLoan.AccountId];
    const bodyLines = editableBody.split("\n");

    return (
      <div>
        {/* Controls */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              Letter Type
            </Text>
            <Select
              value={letterType}
              onChange={setLetterType}
              options={LETTER_TYPES}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={8}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              Letter Date
            </Text>
            <DatePicker
              value={letterDate}
              onChange={(d) => d && setLetterDate(d)}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={8}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              Compliance Date
            </Text>
            <DatePicker
              value={complianceDate}
              onChange={(d) => d && setComplianceDate(d)}
              style={{ width: "100%" }}
            />
          </Col>
        </Row>

        <Divider />

        {/* Loan Summary */}
        <Descriptions bordered size="small" column={2} title="Loan Summary">
          <Descriptions.Item label="Account ID">{selectedLoan.AccountId}</Descriptions.Item>
          <Descriptions.Item label="Loan Cycle">{selectedLoan.LoanCycleNo}</Descriptions.Item>
          <Descriptions.Item label="Borrower">
            {client
              ? [client.FirstName, client.MiddleName, client.LastName].filter(Boolean).join(" ")
              : selectedLoan.AccountId}
          </Descriptions.Item>
          <Descriptions.Item label="Address">{client?.CurrentAddress || "N/A"}</Descriptions.Item>
          <Descriptions.Item label="Loan Amount">{fmtCurrency(selectedLoan.LoanAmount)}</Descriptions.Item>
          <Descriptions.Item label="Balance">{fmtCurrency(selectedLoan.LoanBalance)}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[selectedLoan.LoanStatus] || "default"}>
              {selectedLoan.LoanStatus}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Maturity">
            {selectedLoan.MaturityDate
              ? dayjs(selectedLoan.MaturityDate).format("MM/DD/YYYY")
              : "N/A"}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Editing Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Space>
            <Tooltip title={isEditing ? "Switch to Preview" : "Edit Letter Content"}>
              <Button
                type={isEditing ? "primary" : "default"}
                icon={isEditing ? <EyeOutlined /> : <EditOutlined />}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Preview" : "Edit"}
              </Button>
            </Tooltip>
            <Tooltip title="Reset to Template">
              <Button
                icon={<UndoOutlined />}
                onClick={() => initEditableContent(selectedLoan, client)}
              >
                Reset
              </Button>
            </Tooltip>
          </Space>
          {isEditing && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Edit the letter title and body text below. Use blank lines for paragraph spacing.
            </Text>
          )}
        </div>

        {/* Letter Content — Editable or Preview */}
        {isEditing ? (
          <Card
            size="small"
            style={{ border: "1px solid #d9d9d9" }}
          >
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: "block", marginBottom: 4 }}>Letter Title</Text>
              <Input
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                style={{ fontWeight: "bold", fontSize: 14, textAlign: "center" }}
              />
            </div>
            <div>
              <Text strong style={{ display: "block", marginBottom: 4 }}>Letter Body</Text>
              <TextArea
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                autoSize={{ minRows: 12, maxRows: 30 }}
                style={{
                  fontFamily: "'Times New Roman', serif",
                  fontSize: 13,
                  lineHeight: 1.8,
                }}
              />
            </div>
          </Card>
        ) : (
          <Card
            size="small"
            title={editableTitle}
            style={{
              fontFamily: "'Times New Roman', serif",
              border: "1px solid #d9d9d9",
            }}
          >
            {bodyLines.map((line, idx) =>
              line.trim() === "" ? (
                <br key={idx} />
              ) : (
                <p key={idx} style={{ margin: "2px 0", lineHeight: 1.6 }}>
                  {line}
                </p>
              )
            )}
            <Divider />
            <p>
              <strong>Respectfully,</strong>
            </p>
            <br />
            <p>____________________________</p>
            <p>
              <strong>Authorized Representative</strong>
            </p>
          </Card>
        )}

        <Divider />

        {/* Client Document Images (ID, etc.) */}
        <Card
          size="small"
          title={
            <Space>
              <FileImageOutlined />
              <span>Attach Client Documents / ID Images</span>
            </Space>
          }
          style={{ border: "1px solid #d9d9d9" }}
        >
          {loadingDocs ? (
            <div style={{ textAlign: "center", padding: 16 }}>
              <Spin size="small" /> <Text type="secondary"> Loading documents...</Text>
            </div>
          ) : clientDocs.length === 0 ? (
            <Text type="secondary">No image documents found for this client.</Text>
          ) : (
            <Checkbox.Group
              value={selectedDocIds}
              onChange={setSelectedDocIds}
              style={{ width: "100%" }}
            >
              <Row gutter={[12, 12]}>
                {clientDocs.map((d) => (
                  <Col key={d._id} span={8}>
                    <Card
                      size="small"
                      hoverable
                      style={{
                        border: selectedDocIds.includes(d._id)
                          ? "2px solid #1677ff"
                          : "1px solid #d9d9d9",
                      }}
                    >
                      <Checkbox value={d._id} style={{ marginBottom: 8 }}>
                        <Text ellipsis style={{ maxWidth: 140 }}>{d.name}</Text>
                      </Checkbox>
                      <Image
                        src={d.url || d.link}
                        alt={d.name}
                        width="100%"
                        height={80}
                        style={{ objectFit: "cover", borderRadius: 4 }}
                        preview={{ mask: "Preview" }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iODAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCIgeT0iNDUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNjY2MiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=="
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          )}
          {selectedDocIds.length > 0 && (
            <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
              {selectedDocIds.length} document(s) will be attached to the PDF.
            </Text>
          )}
        </Card>
      </div>
    );
  };

  return (
    <>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Demand Letters & Notices</Title>}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setCache("demand_letter_loans", null);
              fetchOverdueLoans();
            }}
          >
            Refresh
          </Button>
        }
      >
        <Space style={{ marginBottom: 16, width: "100%" }}>
          <Search
            placeholder="Search by name, account ID, or status..."
            allowClear
            onSearch={(val) => setSearchText(val)}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 350 }}
          />
          <Text type="secondary">
            Showing {filteredLoans.length} overdue loan(s)
          </Text>
        </Space>

        <Table
          dataSource={filteredLoans}
          columns={columns}
          loading={loading}
          rowKey={(r) => r._id || r.LoanCycleNo}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 950 }}
        />
      </Card>

      {/* Preview & Generate Modal */}
      <Modal
        title="Generate Letter"
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setSelectedLoan(null);
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Print
          </Button>,
          <Button
            key="pdf"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={generatePDF}
          >
            Download PDF
          </Button>,
        ]}
      >
        {renderPreview()}
      </Modal>
    </>
  );
};

export default DemandLetter;
