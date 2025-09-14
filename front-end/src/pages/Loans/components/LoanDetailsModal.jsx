import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Typography,
  message,
  Tabs,
  Space,
  Row,
  Col,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Card,
  Tag,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import LoanRateConfig from "../../Settings/LoanRateConfig/LoanRateConfig";

import LoanPersonalInfoTab from "./LoanPersonalInfoTab";
import LoanInfoTab from "./LoanInfoTab";
import LoanDocumentsTab from "./LoanDocumentsTab";

const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const LOAN_TYPES = ["New", "Renewal"];
const LOAN_STATUSES = [
  "UPDATED",
  "ARREARS",
  "PAST DUE",
  "LITIGATION",
  "DORMANT",
];
const PAYMENT_MODES = ["DAILY", "WEEKLY", "SEMI-MONTHLY", "MONTHLY"];
const LOAN_TERMS = [
  "1 month",
  "2 months",
  "3 months",
  "4 months",
  "5 months",
  "6 months",
  "7 months",
  "8 months",
  "9 months",
  "10 months",
  "11 months",
  "12 months",
];

const LOAN_PROCESS_STATUSES = ["Approved", "Updated", "Released", "Pending"];

// Colors for Loan Status
const LOAN_STATUS_COLORS = {
  UPDATED: "green",
  ARREARS: "orange",
  "PAST DUE": "red",
  LITIGATION: "volcano",
  DORMANT: "gray",
};

// Colors for Loan Process Status
const LOAN_PROCESS_STATUS_COLORS = {
  Updated: "green",
  Approved: "blue",
  Pending: "gold",
  Releasing: "purple",
};

export default function LoanDetailsModal({
  visible,
  onClose,
  loan,
  loading,
  onLoanUpdate,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState("1");
  const [editedLoan, setEditedLoan] = useState(loan);
  const [loanDisbursed, setLoanDisbursed] = useState([]);
  const [isAddLoanModalVisible, setIsAddLoanModalVisible] = useState(false);
  const [isEditLoanRecordModalVisible, setIsEditLoanRecordModalVisible] =
    useState(false);
  const [editingLoanRecord, setEditingLoanRecord] = useState(null);
  const [loanRates, setLoanRates] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [newLoanRecord, setNewLoanRecord] = useState({
    LoanNo: "",
    LoanType: "",
    LoanStatus: "",
    LoanAmount: 0,
    LoanBalance: 0,
    LoanAmortization: "",
    PaymentMode: "",
    StartPaymentDate: null,
    MaturityDate: null,
    PrincipalAmount: 0,
    LoanInterest: 0,
    Penalty: 0,
    LoanTerm: "",
    LoanProcessStatus: "",
    Date_Encoded: null,
    Date_Modified: null,
    CollectorName: "",
  });
  const [mergedLoans, setMergedLoans] = useState([]);
  const [isLoanRateModalVisible, setIsLoanRateModalVisible] = useState(false);

  useEffect(() => {
    setEditedLoan(loan);
    setIsEditing(false);
  }, [loan]);

  useEffect(() => {
    if (visible) {
      api
        .get("/loan_rates")
        .then((res) => {
          setLoanRates(res.data);
        })
        .catch((err) => {
          console.error("Error fetching loan rates:", err);
          message.error("Could not load loan rate configurations.");
        });

      api
        .get("/collectors")
        .then((res) => {
          setCollectors(res.data.data);
        })
        .catch((err) => {
          console.error("Error fetching collectors:", err);
          message.error("Could not load collectors.");
        });
    }
  }, [visible]);

  useEffect(() => {
    if (loan?.ClientNo) {
      //console.log("Fetching disbursed loans for ClientNo:", loan.ClientNo);
      api
        .get(`/loan_disbursed/client/${loan.ClientNo}`)
        .then((res) => {
          //console.log("API response for disbursed loans:", res.data);
          if (res.data.success) {
            setLoanDisbursed(res.data.data);
            //console.log("Loan disbursed data set:", res.data.data);
          } else {
            setLoanDisbursed([]);
            //console.log("API call for disbursed loans not successful.");
          }
        })
        .catch((err) => {
          console.error("Error fetching disbursed loans:", err);
          setLoanDisbursed([]);
        });
    }
  }, [loan]);

  const handleEdit = () => setIsEditing(true);

  const handleSave = async () => {
    try {
      const res = await api.put(`/loans/${editedLoan._id}`, editedLoan);
      if (res.data.success) {
        message.success("Loan details updated successfully!");
        if (onLoanUpdate) {
          onLoanUpdate();
        }
        onClose();
      } else {
        message.error(res.data.message || "Failed to update loan details.");
      }
    } catch (err) {
      console.error("Error saving loan details:", err);
      message.error("Error saving loan details.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedLoan(loan);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditedLoan((prev) => {
      const newEditedLoan = { ...prev };
      const fieldParts = field.split(".");
      let current = newEditedLoan;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!current[fieldParts[i]]) current[fieldParts[i]] = {};
        current = current[fieldParts[i]];
      }
      current[fieldParts[fieldParts.length - 1]] = value;
      return newEditedLoan;
    });
  };

  const handleNewLoanRecordChange = (field, value) => {
    setNewLoanRecord((prev) => {
      let updatedRecord = { ...prev, [field]: value };

      if (field === "LoanType" && value === "Renewal" && loan?.LoanNo) {
        // Find the highest renewal number for this loan
        const renewalLoans = loanDisbursed.filter(
          (d) => d.LoanNo && d.LoanNo.startsWith(`${loan.LoanNo}-R`)
        );
        let maxRenewalNum = 0;
        renewalLoans.forEach((rl) => {
          const match = rl.LoanNo.match(/-R(\d+)$/);
          if (match) {
            maxRenewalNum = Math.max(maxRenewalNum, parseInt(match[1], 10));
          }
        });
        updatedRecord.LoanNo = `${loan.LoanNo}-R${maxRenewalNum + 1}`;
      } else if (field === "LoanType" && value === "New" && loan?.LoanNo) {
        updatedRecord.LoanNo = loan.LoanNo; // Reset to original loan number for new loans
      }

      return updatedRecord;
    });
  };

  const handleAddLoanRecordSubmit = async () => {
    try {
      let baseLoanNo = newLoanRecord.loanNo; // e.g., RCT-2024-11546

      // ✅ Check existing disbursed loans of this client
      const existingLoans = loanDisbursed.filter((l) =>
        l.LoanNo?.startsWith(baseLoanNo)
      );

      let newLoanNo = baseLoanNo;

      if (existingLoans.length > 0) {
        // Extract renewal suffix numbers (-R1, -R2, etc.)
        const renewalNumbers = existingLoans
          .map((l) => {
            const match = l.LoanNo?.match(/-R(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => num > 0);

        const nextRenewal =
          renewalNumbers.length > 0 ? Math.max(...renewalNumbers) + 1 : 1;

        newLoanNo = `${baseLoanNo}-R${nextRenewal}`;
      }

      // ✅ Call API with generated LoanNo
      const res = await api.post("/loan_disbursed", {
        ...newLoanRecord,
        LoanNo: newLoanNo, // always system-generated
        ClientNo: loan.ClientNo,
      });

      if (res.data.success) {
        message.success(
          `New loan record added successfully! LoanNo: ${newLoanNo}`
        );
        setIsAddLoanModalVisible(false);

        // Refresh the loan disbursed list
        if (loan?.ClientNo) {
          try {
            const refreshRes = await api.get(
              `/loan_disbursed/client/${loan.ClientNo}`
            );
            if (refreshRes.data.success) {
              setLoanDisbursed(refreshRes.data.data);
            } else {
              setLoanDisbursed([]);
            }
          } catch (err) {
            console.error("Error fetching disbursed loans:", err);
            setLoanDisbursed([]);
          }
        }
      } else {
        message.error(res.data.message || "Failed to add loan record.");
      }
    } catch (err) {
      console.error("Error adding loan record:", err);
      message.error("Error adding loan record.");
    }
  };

  const handleEditLoanRecord = (record) => {
    setEditingLoanRecord(record);
    setIsEditLoanRecordModalVisible(true);
  };

  const handleEditLoanRecordChange = (field, value) => {
    setEditingLoanRecord((prev) => ({
      ...prev,
      [field]: value,
    }));

    setMergedLoans((prevLoans) =>
      prevLoans.map((loan) =>
        loan._id === editingLoanRecord._id ? { ...loan, [field]: value } : loan
      )
    );
  };

  const handleUpdateLoanRecord = () => {
    try {
      // await api.updateLoan(editingLoanRecord);
      setMergedLoans((prevLoans) =>
        prevLoans.map((loan) =>
          loan._id === editingLoanRecord._id ? editingLoanRecord : loan
        )
      );
      setIsEditLoanRecordModalVisible(false);
      message.success("Loan record updated successfully!");
    } catch (err) {
      message.error("Failed to update loan record. Please try again.");
    }
  };

  useEffect(() => {
    const merged = [
      ...(loan?.allClientLoans?.map((l) => ({
        ...l,
        LoanNo: l.loanInfo?.loanNo || l.LoanNo,
        LoanType: l.loanInfo?.type,
        LoanStatus: l.loanInfo?.status,
        LoanAmount: l.loanInfo?.amount,
        LoanBalance: l.loanInfo?.balance,
        LoanAmortization: l.loanInfo?.amortization || "",
        PaymentMode: l.loanInfo?.paymentMode,
        StartPaymentDate: l.loanInfo?.startPaymentDate || "",
        MaturityDate: l.loanInfo?.maturityDate || "",
        Source: "Client Loan",
        PrincipalAmount: l.loanInfo?.principalAmount || "",
        LoanInterest: l.loanInfo?.interest || "",
        Penalty: l.loanInfo?.penalty || "",
        LoanTerm: l.loanInfo?.term || "",
        LoanProcessStatus: l.loanInfo?.processStatus || "",
        Date_Encoded: l.loanInfo?.dateEncoded || "",
        Date_Modified: l.loanInfo?.dateModified || "",
        CollectorName: l.loanInfo?.collectorName || "",
      })) || []),
      ...(loanDisbursed?.map((d) => ({ ...d, Source: "Disbursed" })) || []),
    ];

    setMergedLoans(merged);
  }, [loan, loanDisbursed]);

  // utility function to generate new loan number
  const generateLoanNo = (lastLoanNo, isRenewal = false) => {
    const year = new Date().getFullYear();
    let baseNumber;

    if (!lastLoanNo) {
      // first loan case
      baseNumber = 11546; // or fetch from DB / increment logic
      return `RCT-${year}-${baseNumber}`;
    }

    // if renewal, add/increment R suffix
    if (isRenewal) {
      const renewalMatch = lastLoanNo.match(/-R(\d+)$/);
      if (renewalMatch) {
        const renewalNumber = parseInt(renewalMatch[1], 10) + 1;
        return lastLoanNo.replace(/-R\d+$/, `-R${renewalNumber}`);
      } else {
        return `${lastLoanNo}-R1`;
      }
    }

    // default incrementing the sequence number
    const parts = lastLoanNo.split("-");
    baseNumber = parseInt(parts[2], 10) + 1;
    return `RCT-${year}-${baseNumber}`;
  };

  useEffect(() => {
    if (isAddLoanModalVisible) {
      // assume you have loanDisbursed as the current list
      const lastLoan = loanDisbursed?.[loanDisbursed.length - 1];
      const lastLoanNo = lastLoan?.LoanNo;

      setNewLoanRecord((prev) => ({
        ...prev,
        LoanNo: generateLoanNo(lastLoanNo, false), // false = new, not renewal
      }));
    }
  }, [isAddLoanModalVisible]);

  const loanInfoColumns = [
    {
      title: "Loan No. & Status",
      key: "loanNoAndStatus",
      render: (record) => (
        <>
          <div>
            <strong>Loan No:</strong> {record.loanNo || "N/A"}
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: 4 }}>
            <strong>Loan Type:</strong> {record.LoanType}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Status:</strong> {record.LoanStatus}
          </div>
          {record.LoanProcessStatus && (
            <div style={{ fontSize: "12px", color: "#888" }}>
              <strong>Process Status:</strong> {record.LoanProcessStatus}
            </div>
          )}
        </>
      ),
      width: 200,
    },
    {
      title: "Amounts",
      key: "amounts",
      width: 250,
      render: (record) => (
        <>
          <div>Loan: {record.LoanAmount}</div>
          {record.PrincipalAmount && (
            <div>Principal: {record.PrincipalAmount}</div>
          )}
          <div>Balance: {record.LoanBalance}</div>
          <div>Interest: {record.LoanInterest}</div>
          <div>Penalty: {record.Penalty}</div>
          <div>Amort: {record.LoanAmortization}</div>
        </>
      ),
    },
    {
      title: "Dates, Term & Collector",
      key: "datesTermAndCollector",
      render: (record) => (
        <>
          {record.StartPaymentDate && (
            <div>
              Payment Start:{" "}
              {dayjs(record.StartPaymentDate).format("MM/DD/YYYY")}
            </div>
          )}
          {record.MaturityDate && (
            <div>
              Payment Maturity:{" "}
              {dayjs(record.MaturityDate).format("MM/DD/YYYY")}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <strong>Term:</strong> {record.LoanTerm}
          </div>
          <div>
            <strong>Payment:</strong> {record.PaymentMode}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Collector:</strong> {record.CollectorName}
          </div>
        </>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => (
        <Space size="middle">
          <Button type="primary" onClick={() => handleEditLoanRecord(record)}>
            Edit
          </Button>
          <Button danger>Delete</Button>
        </Space>
      ),
    },
  ];

  const renderField = (
    label,
    field,
    value,
    type = "text",
    onChangeHandler,
    disabled = false,
    options = []
  ) => {
    const handleChange = (val) => {
      if (field === "LoanType") {
        // Special handling for LoanType
        setNewLoanRecord((prev) => {
          let updatedRecord = { ...prev, LoanType: val };

          let baseLoanNo = prev.LoanNo ? prev.LoanNo.split("-R")[0] : "";

          if (val === "Renewal") {
            // Scan existing renewals
            const existingRenewals = loanDisbursed
              .map((loan) => loan.LoanNo)
              .filter((ln) => ln.startsWith(baseLoanNo) && ln.includes("-R"))
              .map((ln) => parseInt(ln.split("-R")[1] || "0", 10));

            const nextRenewal = existingRenewals.length
              ? Math.max(...existingRenewals) + 1
              : 1;

            updatedRecord.LoanNo = `${baseLoanNo}-R${nextRenewal}`;
          } else {
            updatedRecord.LoanNo = baseLoanNo;
          }

          return updatedRecord;
        });
      } else {
        onChangeHandler(field, val);
      }
    };

    const labelContent = (
      <div style={{ display: "flex", alignItems: "center" }}>
        <Text style={{ fontWeight: "normal" }}>{label}</Text>
        {label === "Loan Amount" && (
          <Tooltip title="Check Loan Rates">
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => setIsLoanRateModalVisible(true)}
              style={{ marginLeft: 4, padding: 0, border: "none" }}
            />
          </Tooltip>
        )}
      </div>
    );

    return (
      <div style={{ marginBottom: 12 }}>
        {labelContent}
        {type === "date" ? (
          <DatePicker
            value={value ? dayjs(value) : null}
            onChange={(date) =>
              handleChange(date ? date.format("MM/DD/YYYY") : null)
            }
            disabled={disabled}
            style={{ width: "100%" }}
          />
        ) : type === "number" ? (
          <InputNumber
            value={value || 0}
            onChange={(val) => handleChange(val)}
            disabled={disabled}
            style={{ width: "100%" }}
            size="small"
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(val) => val.replace(/[^\d.]/g, "")}
          />
        ) : type === "select" ? (
          <Select
            value={value || undefined}
            onChange={(val) => handleChange(val)}
            disabled={disabled}
            style={{ width: "100%" }}
            placeholder={`Select ${label}`}
          >
            {options.map((option) => {
              if (field === "LoanStatus") {
                return (
                  <Option key={option} value={option}>
                    <Tag color={LOAN_STATUS_COLORS[option] || "default"}>
                      {option}
                    </Tag>
                  </Option>
                );
              }
              if (field === "LoanProcessStatus") {
                return (
                  <Option key={option} value={option}>
                    <Tag
                      color={LOAN_PROCESS_STATUS_COLORS[option] || "default"}
                    >
                      {option}
                    </Tag>
                  </Option>
                );
              }
              return (
                <Option key={option} value={option}>
                  {option}
                </Option>
              );
            })}
          </Select>
        ) : (
          <Input
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            size="small"
            style={{ width: "100%", height: 32 }}
            type={type}
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      title="Loan Details"
      open={visible}
      width={950}
      onCancel={onClose}
      footer={[
        activeTabKey !== "2" && !isEditing && (
          <Button key="edit" icon={<EditOutlined />} onClick={handleEdit}>
            Edit
          </Button>
        ),
        activeTabKey !== "2" && isEditing && (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            Save
          </Button>
        ),
        activeTabKey !== "2" && isEditing && (
          <Button key="cancel" icon={<CloseOutlined />} onClick={handleCancel}>
            Cancel
          </Button>
        ),
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ].filter(Boolean)}
    >
      {loading ? (
        <div>Loading...</div>
      ) : loan ? (
        <Tabs
          defaultActiveKey="1"
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
        >
          {/* Personal Info */}
          <TabPane tab="Personal Information" key="1">
            <LoanPersonalInfoTab
              editedLoan={editedLoan}
              handleChange={handleChange}
            />
          </TabPane>

          {/* Loan Info */}
          <TabPane tab="Loan Information" key="2">
            <LoanInfoTab
              mergedLoans={mergedLoans} // ✅ now state-driven
              loanInfoColumns={loanInfoColumns}
              setIsAddLoanModalVisible={setIsAddLoanModalVisible}
              handleEditLoanRecord={handleEditLoanRecord}
            />
          </TabPane>

          {/* Documents */}
          <TabPane tab="Documents" key="3">
            <LoanDocumentsTab />
          </TabPane>
        </Tabs>
      ) : (
        <div>No loan details</div>
      )}

      {/* Modal for Adding New Loan Record */}
      <Modal
        title="Add New Loan Record"
        open={isAddLoanModalVisible}
        onCancel={() => setIsAddLoanModalVisible(false)}
        onOk={handleAddLoanRecordSubmit}
        width={1000}
      >
        <>
          <Row gutter={16} align="stretch">
            {/* Loan Details */}
            <Col span={12}>
              <Card
                title="Loan Details"
                size="small"
                style={{ marginBottom: 16, minHeight: "235px" }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan No",
                      "LoanNo",
                      newLoanRecord.LoanNo,
                      "text",
                      handleNewLoanRecordChange,
                      true // ✅ mark as disabled so user can’t change it
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Loan Type",
                      "LoanType",
                      newLoanRecord.LoanType,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_TYPES
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Status",
                      "LoanStatus",
                      newLoanRecord.LoanStatus,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_STATUSES
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Loan Process Status",
                      "LoanProcessStatus",
                      newLoanRecord.LoanProcessStatus,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_PROCESS_STATUSES
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Loan Amount Details */}
            <Col span={12}>
              <Card
                title="Loan Amount Details"
                size="small"
                style={{ marginBottom: 16, minHeight: "235px" }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Amount",
                      "LoanAmount",
                      newLoanRecord.LoanAmount,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Principal Amount",
                      "PrincipalAmount",
                      newLoanRecord.PrincipalAmount,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Balance",
                      "LoanBalance",
                      newLoanRecord.LoanBalance,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Loan Interest",
                      "LoanInterest",
                      newLoanRecord.LoanInterest,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Penalty",
                      "Penalty",
                      newLoanRecord.Penalty,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Amortization",
                      "LoanAmortization",
                      newLoanRecord.LoanAmortization,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} align="stretch">
            {/* Terms and Payments */}
            <Col span={12}>
              <Card
                title="Terms and Payments"
                size="small"
                style={{ marginBottom: 16, minHeight: "200px" }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Term",
                      "LoanTerm",
                      newLoanRecord.LoanTerm,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_TERMS
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Payment Mode",
                      "PaymentMode",
                      newLoanRecord.PaymentMode,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      PAYMENT_MODES
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    {renderField(
                      "Collector Name",
                      "CollectorName",
                      newLoanRecord.CollectorName,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      collectors.map((collector) => collector.Name)
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Loan Collection Date */}
            <Col span={12}>
              <Card
                title="Loan Collection Date"
                size="small"
                style={{ marginBottom: 16, minHeight: "200px" }}
              >
                {renderField(
                  "Start Payment Date",
                  "StartPaymentDate",
                  newLoanRecord.StartPaymentDate,
                  "date",
                  handleNewLoanRecordChange
                )}
                {renderField(
                  "Maturity Date",
                  "MaturityDate",
                  newLoanRecord.MaturityDate,
                  "date",
                  handleNewLoanRecordChange
                )}
              </Card>
            </Col>
          </Row>
        </>
      </Modal>

      {/* Modal for Editing Loan Record */}
      <Modal
        title="Edit Loan Record"
        open={isEditLoanRecordModalVisible}
        onCancel={() => setIsEditLoanRecordModalVisible(false)}
        onOk={handleUpdateLoanRecord}
        width={1000}
      >
        {editingLoanRecord && (
          <>
            <Row gutter={16} align="stretch">
              <Col span={12}>
                <Card
                  title="Loan Details"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "235px" }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan No",
                        "LoanNo",
                        editingLoanRecord.loanNo,
                        "text",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Loan Type",
                        "LoanType",
                        editingLoanRecord.LoanType,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_TYPES
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Status",
                        "LoanStatus",
                        editingLoanRecord.LoanStatus,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_STATUSES
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Loan Process Status",
                        "LoanProcessStatus",
                        editingLoanRecord.LoanProcessStatus,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_PROCESS_STATUSES
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title="Loan Amount Details"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "235px" }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Amount",
                        "LoanAmount",
                        editingLoanRecord.LoanAmount,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Principal Amount",
                        "PrincipalAmount",
                        editingLoanRecord.PrincipalAmount,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Balance",
                        "LoanBalance",
                        editingLoanRecord.LoanBalance,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Loan Interest",
                        "LoanInterest",
                        editingLoanRecord.LoanInterest,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Penalty",
                        "Penalty",
                        editingLoanRecord.Penalty,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Amortization",
                        "LoanAmortization",
                        editingLoanRecord.LoanAmortization,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <Row gutter={16} align="stretch">
              <Col span={12}>
                <Card
                  title="Terms and Payments"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "200px" }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Term",
                        "LoanTerm",
                        editingLoanRecord.LoanTerm,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_TERMS
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Payment Mode",
                        "PaymentMode",
                        editingLoanRecord.PaymentMode,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        PAYMENT_MODES
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      {" "}
                      {/* Adjusted span to 24 as it's the only element in this row now */}
                      {renderField(
                        "Collector Name",
                        "CollectorName",
                        editingLoanRecord.CollectorName,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        collectors.map((collector) => collector.Name)
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title="Loan Collection Date"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "200px" }}
                >
                  {renderField(
                    "Start Payment Date",
                    "StartPaymentDate",
                    editingLoanRecord.StartPaymentDate,
                    "date",
                    handleEditLoanRecordChange
                  )}
                  {renderField(
                    "Maturity Date",
                    "MaturityDate",
                    editingLoanRecord.MaturityDate,
                    "date",
                    handleEditLoanRecordChange
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal>

      <Modal
        title="Loan Rates Configuration"
        open={isLoanRateModalVisible}
        onCancel={() => setIsLoanRateModalVisible(false)}
        footer={null}
        width={1200}
      >
        <LoanRateConfig isModal={true} />
      </Modal>
    </Modal>
  );
}