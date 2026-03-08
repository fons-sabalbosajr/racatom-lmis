import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  message,
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
} from "antd";
import {
  PrinterOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCache, setCache } from "../../../utils/simpleCache";

const { Search } = Input;
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
  // Client data is now derived from loan records (no separate endpoint needed)
  const [loanClients, setLoanClients] = useState([]);

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
      const allLoans = loansRes.data || [];

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
      message.error("Failed to fetch overdue loans");
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
          `This is to formally demand payment of your outstanding loan obligation with RACATOM Lending Management and Information System.`,
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

  // ─── Generate PDF ──────────────────────────────────────────
  const generatePDF = () => {
    if (!selectedLoan) return;

    const client = clientMap[selectedLoan.AccountId];
    const letter = getLetterContent(selectedLoan, client);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    const maxWidth = pageWidth - margin * 2;
    let y = 30;

    // Header
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("RACATOM Lending Management and Information System", pageWidth / 2, y, {
      align: "center",
    });
    y += 8;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0);
    doc.text(letter.title, pageWidth / 2, y, { align: "center" });
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

    for (const line of letter.body) {
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
    doc.save(`${letter.title.replace(/\s/g, "_")}_${borrowerName}_${letterDate.format("YYYYMMDD")}.pdf`);
    message.success("PDF generated successfully!");
  };

  // ─── Preview content ──────────────────────────────────────
  const renderPreview = () => {
    if (!selectedLoan) return null;
    const client = clientMap[selectedLoan.AccountId];
    const letter = getLetterContent(selectedLoan, client);

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

        {/* Letter Preview */}
        <Card
          size="small"
          title={letter.title}
          style={{
            fontFamily: "'Times New Roman', serif",
            border: "1px solid #d9d9d9",
          }}
        >
          {letter.body.map((line, idx) =>
            line === "" ? (
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
