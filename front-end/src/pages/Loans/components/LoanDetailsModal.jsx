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
  Popconfirm,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import LoanRateConfig from "../../Settings/LoanRateConfig/LoanRateConfig";

import LoanPersonalInfoTab from "./LoanPersonalInfoTab";
import LoanInfoTab from "./LoanInfoTab";
import LoanDocumentsTab from "./LoanDocumentsTab";
import Collections from "../../Collections/Collections";

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

// Colors for Loan Type
const LOAN_TYPE_COLORS = {
  New: "blue",
  Renewal: "purple",
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
    Remarks: "",
  });
  const [mergedLoans, setMergedLoans] = useState([]);
  const [loanCollections, setLoanCollections] = useState([]); // New state for collections
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
    if (loan?.clientNo) {
      const fetchLoanData = async () => {
        try {
          const [disbursedRes] = await Promise.all([
            api.get(`/loan_disbursed/client/${loan.clientNo}`),
          ]);

          if (disbursedRes.data.success) {
            setLoanDisbursed(disbursedRes.data.data);
          } else {
            setLoanDisbursed([]);
          }

          // Get all unique LoanCycleNos from clientLoans and disbursedLoans
          const allLoanCycleNos = new Set();
          loan?.allClientLoans?.forEach((l) => {
            if (l.LoanCycleNo) allLoanCycleNos.add(l.LoanCycleNo);
          });
          disbursedRes.data.data?.forEach((d) => {
            if (d.LoanCycleNo) allLoanCycleNos.add(d.LoanCycleNo);
          });

          const collectionPromises = Array.from(allLoanCycleNos).map((cycleNo) =>
            api.get(`/loan-collections/${cycleNo}`, { params: { limit: 0 } }) // Fetch all collections for running balance calculation
          );

          const collectionsResults = await Promise.all(collectionPromises);
          const allCollections = collectionsResults.flatMap((res) =>
            res.data.success ? res.data.data : []
          );
          setLoanCollections(allCollections);
        } catch (err) {
          console.error("Error fetching loan data:", err);
          message.error("Error fetching loan data.");
          setLoanDisbursed([]);
          setLoanCollections([]);
        }
      };
      fetchLoanData();
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

      if (
        field === "LoanType" &&
        value === "Renewal" &&
        loan?.loanInfo.loanNo
      ) {
        const baseLoanNo = loan.loanInfo.loanNo.split("-R")[0];
        const renewalLoans = mergedLoans.filter(
          (d) => d.LoanNo && d.LoanNo.startsWith(`${baseLoanNo}-R`)
        );
        let maxRenewalNum = 0;
        renewalLoans.forEach((rl) => {
          const match = rl.LoanNo.match(/-R(\d+)$/);
          if (match) {
            maxRenewalNum = Math.max(maxRenewalNum, parseInt(match[1], 10));
          }
        });
        updatedRecord.LoanNo = `${baseLoanNo}-R${maxRenewalNum + 1}`;
      } else if (
        field === "LoanType" &&
        value === "New" &&
        loan?.loanInfo.loanNo
      ) {
        updatedRecord.LoanNo = loan.loanInfo.loanNo.split("-R")[0];
      }

      return updatedRecord;
    });
  };

  const handleAddLoanRecordSubmit = async () => {
    try {
      const res = await api.post("/loan_disbursed", {
        ...newLoanRecord,
        ClientNo: loan.clientNo,
        AccountId: loan.accountId,
      });

      if (res.data.success) {
        message.success("New loan record added successfully!");
        setIsAddLoanModalVisible(false);
        if (loan?.clientNo) {
          const refreshRes = await api.get(
            `/loan_disbursed/client/${loan.clientNo}`
          );
          if (refreshRes.data.success) {
            setLoanDisbursed(refreshRes.data.data);
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

  const handleDeleteLoanRecord = async (record) => {
    try {
      if (record.Source === "Client Loan") {
        await api.delete(`/loans/${record._id}`);
      } else if (record.Source === "Disbursed") {
        await api.delete(`/loan_disbursed/${record._id}`);
      } else {
        message.error("Unknown loan source, cannot delete.");
        return;
      }

      message.success("Loan record deleted successfully.");

      setMergedLoans((prev) => prev.filter((item) => item._id !== record._id));
    } catch (err) {
      console.error("Error deleting loan record:", err);
      message.error(
        err.response?.data?.message || "Failed to delete loan record."
      );
    }
  };

  const handleEditLoanRecordChange = (field, value) => {
    //console.log(`Updating field: ${field}, with value: ${value}`);
    setEditingLoanRecord((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateLoanRecord = async () => {
    try {
      const payload = { ...editingLoanRecord };
      const res = await api.put(`/loans/cycle/${payload._id}`, payload);

      if (res.data.success) {
        message.success("Loan record updated successfully!");
        setIsEditLoanRecordModalVisible(false);

        // Manually update the mergedLoans state
        setMergedLoans(prev => {
          const index = prev.findIndex(item => item._id === payload._id);
          if (index > -1) {
            const newMergedLoans = [...prev];
            newMergedLoans[index] = { ...newMergedLoans[index], ...payload };
            return newMergedLoans;
          }
          return prev;
        });

        if (onLoanUpdate) {
          onLoanUpdate();
        }

      } else {
        message.error(res.data.message || "Failed to update loan record.");
      }
    } catch (err) {
      console.error("Error updating loan record:", err);
      message.error("Failed to update loan record. Please try again.");
    }
  };

  useEffect(() => {
    const clientLoans =
      loan?.allClientLoans?.map((l) => {
        const latestCollection = loanCollections
          .filter((collection) => collection.LoanCycleNo === l.loanInfo.loanNo)
          .sort((a, b) => {
            // Sort by PaymentDate descending, then createdAt descending
            const dateA = dayjs(a.PaymentDate || a.createdAt);
            const dateB = dayjs(b.PaymentDate || b.createdAt);
            if (dateA.isBefore(dateB)) return 1;
            if (dateA.isAfter(dateB)) return -1;

            const createdA = dayjs(a.createdAt);
            const createdB = dayjs(b.createdAt);
            if (createdA.isBefore(createdB)) return 1;
            if (createdA.isAfter(createdB)) return -1;
            return 0;
          })[0];

        return {
          _id: l._id,
          LoanNo: l.loanInfo?.loanNo,
          LoanType: l.loanInfo?.type,
          LoanStatus: l.loanInfo?.status,
          LoanAmount: l.loanInfo?.amount,
          PrincipalAmount: l.loanInfo?.principal,
          LoanInterest: l.loanInfo?.interest,
          Penalty: l.loanInfo?.penalty,
          LoanTerm: l.loanInfo?.term,
          LoanProcessStatus: l.loanInfo?.processStatus,
          CollectorName: l.loanInfo?.collectorName,
          Remarks: l.loanInfo?.remarks, // This was missing
          Source: "Client Loan",
          PaymentMode: l.loanInfo?.paymentMode,
          StartPaymentDate: l.loanInfo?.startPaymentDate,
          MaturityDate: l.loanInfo?.maturityDate,
          // Use RunningBalance from latest collection, or default to LoanBalance
          RunningBalance: latestCollection
            ? parseFloat(latestCollection.RunningBalance)
            : l.loanInfo?.balance,
        };
      }) || [];

    const clientLoanNos = new Set(clientLoans.map((l) => l.LoanNo));

    const disbursedLoans =
      loanDisbursed
        ?.filter((d) => !clientLoanNos.has(d.LoanNo))
        .map((d) => {
          const latestCollection = loanCollections
            .filter((collection) => collection.LoanCycleNo === d.LoanCycleNo)
            .sort((a, b) => {
              const dateA = dayjs(a.PaymentDate || a.createdAt);
              const dateB = dayjs(b.PaymentDate || b.createdAt);
              if (dateA.isBefore(dateB)) return 1;
              if (dateA.isAfter(dateB)) return -1;

              const createdA = dayjs(a.createdAt);
              const createdB = dayjs(b.createdAt);
              if (createdA.isBefore(createdB)) return 1;
              if (createdA.isAfter(createdB)) return -1;
              return 0;
            })[0];

          return {
            ...d,
            StartPaymentDate: d.StartPaymentDate
              ? dayjs(d.StartPaymentDate).toISOString()
              : null,
            MaturityDate: d.MaturityDate
              ? dayjs(d.MaturityDate).toISOString()
              : null,
            Remarks: d.Remarks,
            Source: "Disbursed",
            // Use RunningBalance from latest collection, or default to LoanBalance
            RunningBalance: latestCollection
              ? parseFloat(latestCollection.RunningBalance)
              : d.LoanBalance,
          };
        }) || [];

    const merged = [...clientLoans, ...disbursedLoans];

    setMergedLoans(merged);
  }, [loan, loanDisbursed, loanCollections]);

  const generateLoanNo = (lastLoanNo, isRenewal = false) => {
    const year = new Date().getFullYear();
    let baseNumber;

    if (!lastLoanNo) {
      baseNumber = 11546;
      return `RCT-${year}-${baseNumber}`;
    }

    if (isRenewal) {
      const renewalMatch = lastLoanNo.match(/-R(\d+)$/);
      if (renewalMatch) {
        const renewalNumber = parseInt(renewalMatch[1], 10) + 1;
        return lastLoanNo.replace(/-R\d+$/, `-R${renewalNumber}`);
      } else {
        return `${lastLoanNo}-R1`;
      }
    }

    const parts = lastLoanNo.split("-");
    baseNumber = parseInt(parts[2], 10) + 1;
    return `RCT-${year}-${baseNumber}`;
  };

  useEffect(() => {
    if (isAddLoanModalVisible) {
      const lastLoan =
        mergedLoans.filter((l) => l.Source === "Disbursed").slice(-1)[0] ||
        mergedLoans.slice(-1)[0];
      const lastLoanNo = lastLoan?.LoanNo;

      setNewLoanRecord((prev) => ({
        ...prev,
        LoanNo: generateLoanNo(lastLoanNo, false),
      }));
    }
  }, [isAddLoanModalVisible, mergedLoans]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null || val === "") {
      return "₱0.00";
    }
    const numericVal = Number(String(val).replace(/[₱,]/g, ""));
    return `₱${numericVal.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const loanInfoColumns = [
    {
      title: "Loan No. & Status",
      key: "loanNoAndStatus",
      render: (record) => (
        <>
          <div>
            <strong>Loan No:</strong> {record.LoanNo || "N/A"}
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: 4 }}>
            <strong>Loan Type:</strong>{" "}
            <Tag
              style={{ fontSize: "10px" }}
              color={LOAN_TYPE_COLORS[record.LoanType] || "default"}
            >
              {record.LoanType}
            </Tag>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Status:</strong>{" "}
            <Tag
              style={{ fontSize: "10px" }}
              color={LOAN_STATUS_COLORS[record.LoanStatus] || "default"}
            >
              {record.LoanStatus}
            </Tag>
          </div>
          {record.LoanProcessStatus && (
            <div style={{ fontSize: "12px", color: "#888", marginTop: 4 }}>
              <strong>Process Status:</strong>{" "}
              <Tag
                style={{ fontSize: "10px" }}
                color={
                  LOAN_PROCESS_STATUS_COLORS[record.LoanProcessStatus] ||
                  "default"
                }
              >
                {record.LoanProcessStatus}
              </Tag>
            </div>
          )}
        </>
      ),
      width: 200,
    },
    {
      title: "Amounts",
      key: "amounts",
      width: 180,
      render: (record) => (
        <>
          <div>Loan: {formatCurrency(record.LoanAmount)}</div>
          {record.PrincipalAmount && (
            <div>Principal: {formatCurrency(record.PrincipalAmount)}</div>
          )}
          <div>Balance: {formatCurrency(record.RunningBalance)}</div>
          <div>Interest: {formatCurrency(record.LoanInterest)}</div>
          <div>Penalty: {formatCurrency(record.Penalty)}</div>
          <div>Amort: {formatCurrency(record.LoanAmortization)}</div>
        </>
      ),
    },
    {
      title: "Dates, Term & Collector",
      key: "datesTermAndCollector",
      width: 200,
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
      title: "Remarks",
      dataIndex: "Remarks", // Assuming the field name is 'Remarks'
      key: "remarks",
      width: 150, // Adjust width as needed
      render: (text) => text || "N/A", // Display "N/A" if remarks are empty
    },
    {
      title: "Action",
      key: "action",
      width: 100, // Adjusted width for icons
      render: (text, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEditLoanRecord(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this record?"
            onConfirm={() => handleDeleteLoanRecord(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
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
        setNewLoanRecord((prev) => {
          let updatedRecord = { ...prev, LoanType: val };
          const baseLoanNo = loan.loanInfo.loanNo.split("-R")[0];

          if (val === "Renewal") {
            const renewalLoans = mergedLoans.filter(
              (d) => d.LoanNo && d.LoanNo.startsWith(`${baseLoanNo}-R`)
            );
            let maxRenewalNum = 0;
            renewalLoans.forEach((rl) => {
              const match = rl.LoanNo.match(/-R(\d+)$/);
              if (match) {
                maxRenewalNum = Math.max(maxRenewalNum, parseInt(match[1], 10));
              }
            });
            updatedRecord.LoanNo = `${baseLoanNo}-R${maxRenewalNum + 1}`;
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
              onChangeHandler(field, date ? date.toISOString() : null)
            }
            disabled={disabled}
            style={{ width: "100%" }}
          />
        ) : type === "number" ? (
          <InputNumber
            value={value || 0}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={disabled}
            style={{ width: "100%" }}
            size="small"
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(val) => val.replace(/[^\d.]/g, "")}
          />
        ) : type === "select" ? (
          <Select
            value={value === null || value === undefined ? null : value}
            onChange={(val) => onChangeHandler(field, val)}
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
            onChange={(e) => onChangeHandler(field, e.target.value)}
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
      width={1200}
      onCancel={onClose}
      footer={[
        // Add Loan Record button (only for Loan Information tab when not editing)
        activeTabKey === "2" && !isEditing && (
          <Button
            key="addLoanRecord"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddLoanModalVisible(true)}
          >
            Add Loan Record
          </Button>
        ),
        // Edit button (for tabs 1, 2, 3 when not editing)
        activeTabKey === "1" && !isEditing && (
          <Button key="edit" icon={<EditOutlined />} onClick={handleEdit}>
            Edit
          </Button>
        ),
        // Save button (for tabs 1, 2, 3 when editing)
        activeTabKey !== "4" && isEditing && (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            Save
          </Button>
        ),
        // Cancel button (for tabs 1, 2, 3 when editing)
        activeTabKey !== "4" && isEditing && (
          <Button key="cancel" icon={<CloseOutlined />} onClick={handleCancel}>
            Cancel
          </Button>
        ),
        // Close button (for tabs 1, 2, 3)
        activeTabKey !== "4" && (
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ),
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
          <TabPane tab="Personal Information" key="1">
            <LoanPersonalInfoTab
              editedLoan={editedLoan}
              handleChange={handleChange}
              isEditing={isEditing}
            />
          </TabPane>

          <TabPane tab="Loan Information" key="2">
            <LoanInfoTab
              mergedLoans={mergedLoans}
              loanInfoColumns={loanInfoColumns}
              setIsAddLoanModalVisible={setIsAddLoanModalVisible}
              handleEditLoanRecord={handleEditLoanRecord}
              handleDeleteLoanRecord={handleDeleteLoanRecord} // Pass down the delete handler
            />
          </TabPane>

          <TabPane tab="Documents" key="3">
            <LoanDocumentsTab documents={loan.clientDocuments} />
          </TabPane>
          <TabPane tab="Collections" key="4">
            {loan && <Collections loan={loan} />}
          </TabPane>
        </Tabs>
      ) : (
        <div>No loan details</div>
      )}

      <Modal
        title="Add New Loan Record"
        open={isAddLoanModalVisible}
        onCancel={() => setIsAddLoanModalVisible(false)}
        onOk={handleAddLoanRecordSubmit}
        width={1000}
      >
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
                      newLoanRecord.LoanNo,
                      "text",
                      handleNewLoanRecordChange,
                      true
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
                <Row gutter={16}>
                  <Col span={24}>
                    {renderField(
                      "Remarks",
                      "Remarks",
                      newLoanRecord.Remarks,
                      "text",
                      handleNewLoanRecordChange,
                      false
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
                  "MaturityDate",newLoanRecord.MaturityDate,
                  "date",
                  handleNewLoanRecordChange
                )}
              </Card>
            </Col>
          </Row>
        </>
      </Modal>

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
                        editingLoanRecord.LoanNo,
                        "text",
                        handleEditLoanRecordChange,
                        true // Disable Loan No in edit modal
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
                  <Row gutter={16}>
                    <Col span={24}>
                      {renderField(
                        "Remarks",
                        "Remarks",
                        editingLoanRecord.Remarks,
                        "text",
                        handleEditLoanRecordChange,
                        false
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