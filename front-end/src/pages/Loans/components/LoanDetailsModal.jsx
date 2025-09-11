import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Typography,
  Input,
  message,
  Divider,
  Table,
  Row,
  Col,
  Tabs,
  DatePicker,
  InputNumber,
} from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";

const { Text } = Typography;
const { TabPane } = Tabs;

export default function LoanDetailsModal({ visible, onClose, loan, loading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLoan, setEditedLoan] = useState(loan);
  const [loanDisbursed, setLoanDisbursed] = useState([]);
  const [isAddLoanModalVisible, setIsAddLoanModalVisible] = useState(false);
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

  useEffect(() => {
    setEditedLoan(loan);
    setIsEditing(false);
  }, [loan]);

  useEffect(() => {
    if (loan?.ClientNo) {
      console.log("Fetching disbursed loans for ClientNo:", loan.ClientNo);
      api
        .get(`/api/loan_disbursed/client/${loan.ClientNo}`)
        .then((res) => {
          console.log("API response for disbursed loans:", res.data);
          if (res.data.success) {
            setLoanDisbursed(res.data.data);
            console.log("Loan disbursed data set:", res.data.data);
          } else {
            setLoanDisbursed([]);
            console.log("API call for disbursed loans not successful.");
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
    setNewLoanRecord((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddLoanRecordSubmit = async () => {
    try {
      // Assuming an API endpoint for adding new loan records
      const res = await api.post("/api/loan_disbursed", {
        ...newLoanRecord,
        ClientNo: loan.ClientNo, // Associate with the current client
      });
      if (res.data.success) {
        message.success("New loan record added successfully!");
        setIsAddLoanModalVisible(false);
        // Optionally, refresh the loan disbursed list
        if (loan?.ClientNo) {
          api
            .get(`/api/loan_disbursed/client/${loan.ClientNo}`)
            .then((res) => {
              if (res.data.success) {
                setLoanDisbursed(res.data.data);
              } else {
                setLoanDisbursed([]);
              }
            })
            .catch((err) => {
              console.error("Error fetching disbursed loans:", err);
              setLoanDisbursed([]);
            });
        }
      } else {
        message.error(res.data.message || "Failed to add loan record.");
      }
    } catch (err) {
      console.error("Error adding loan record:", err);
      message.error("Error adding loan record.");
    }
  };

  // 🔹 Merge client loans + disbursed loans
  const mergedLoans = [
    ...(loan?.allClientLoans?.map((l) => ({
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
    ...(loanDisbursed?.map((d) => ({
      LoanNo: d.LoanNo,
      LoanType: d.LoanType,
      LoanStatus: d.LoanStatus,
      LoanAmount: d.LoanAmount,
      LoanBalance: d.LoanBalance,
      LoanAmortization: d.LoanAmortization,
      PaymentMode: d.PaymentMode,
      StartPaymentDate: d.StartPaymentDate,
      MaturityDate: d.MaturityDate,
      Source: "Disbursed",
      PrincipalAmount: d.PrincipalAmount,
      LoanInterest: d.LoanInterest,
      Penalty: d.Penalty,
      LoanTerm: d.LoanTerm,
      LoanProcessStatus: d.LoanProcessStatus,
      Date_Encoded: d.Date_Encoded,
      Date_Modified: d.Date_Modified,
      CollectorName: d.CollectorName,
    })) || []),
  ];
  console.log("Merged loans data for table:", mergedLoans);

  const loanInfoColumns = [
    {
      title: "Loan Number",
      key: "LoanNo",
      render: (text, record) => record.LoanNo || 'N/A',
    },
    {
      title: "Loan & Status",
      key: "loanAndStatus",
      render: (record) => (
        <>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {record.LoanType}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Status:</strong> {record.LoanStatus}
          </div>
          {record.LoanProcessStatus && (
            <div style={{ fontSize: "12px", color: "#888" }}>
              {record.LoanProcessStatus}
            </div>
          )}
        </>
      ),
    },
    {
      title: "Amounts & Term/Payment",
      key: "amountsAndTermPayment",
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
          <div style={{ marginTop: 8 }}>
            <strong>Term:</strong> {record.LoanTerm}
          </div>
          <div>
            <strong>Payment:</strong> {record.PaymentMode}
          </div>
        </>
      ),
    },
    {
      title: "Dates & Collector",
      key: "datesAndCollector",
      render: (record) => (
        <>
          {record.StartPaymentDate && (
            <div>Start: {record.StartPaymentDate}</div>
          )}
          {record.MaturityDate && <div>Maturity: {record.MaturityDate}</div>}
          {record.Date_Encoded && <div>Encoded: {record.Date_Encoded}</div>}
          {record.Date_Modified && <div>Modified: {record.Date_Modified}</div>}
          <div style={{ marginTop: 8 }}>
            <strong>Collector:</strong> {record.CollectorName}
          </div>
        </>
      ),
    },
  ];

  const renderField = (label, field, value, type = "text", onChangeHandler = handleChange, disabled = false) => {
    return (
      <div style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: "normal" }}>{label}</Text>
        {type === "date" ? (
          <DatePicker
            value={value ? dayjs(value) : null}
            onChange={(date) =>
              onChangeHandler(field, date ? date.format("YYYY-MM-DD") : null)
            }
            disabled={disabled}
            style={{ width: "100%" }}
            //size="small"
          />
        ) : type === "number" ? (
          <InputNumber
            value={value || 0}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={disabled}
            style={{ width: "100%" }}
            size="small"
            formatter={(val) =>
              `₱ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(val) => val.replace(/[^\d.]/g, '')}
          />
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
      width={750}
      onCancel={onClose}
      footer={[
        !isEditing && (
          <Button key="edit" icon={<EditOutlined />} onClick={handleEdit}>
            Edit
          </Button>
        ),
        isEditing && (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            Save
          </Button>
        ),
        isEditing && (
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
        <Tabs defaultActiveKey="1">
          {/* Personal Info */}
          <TabPane tab="Personal Information" key="1">
            <Divider orientation="left">Basic Info</Divider>
            <Row gutter={16}>
              <Col span={8}>
                {renderField("Last Name", "LastName", editedLoan?.LastName)}
              </Col>
              <Col span={8}>
                {renderField("First Name", "FirstName", editedLoan?.FirstName)}
              </Col>
              <Col span={8}>
                {renderField(
                  "Middle Name",
                  "MiddleName",
                  editedLoan?.MiddleName
                )}
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                {renderField("Gender", "Gender", editedLoan?.Gender)}
              </Col>
              <Col span={8}>
                {renderField(
                  "Date of Birth",
                  "DateOfBirth",
                  editedLoan?.DateOfBirth,
                  "date"
                )}
              </Col>
              <Col span={8}>
                {renderField(
                  "Civil Status",
                  "CivilStatus",
                  editedLoan?.CivilStatus
                )}
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                {renderField(
                  "Monthly Income",
                  "MonthlyIncome",
                  editedLoan?.MonthlyIncome
                )}
              </Col>
              <Col span={12}>
                {renderField(
                  "No. of Children",
                  "NumberOfChildren",
                  editedLoan?.NumberOfChildren
                )}
              </Col>
            </Row>

            <Divider orientation="left">Contact Info</Divider>
            <Row gutter={16}>
              <Col span={12}>
                {renderField(
                  "Contact Number",
                  "contact.contactNumber",
                  editedLoan?.contact?.contactNumber
                )}
              </Col>
              <Col span={12}>
                {renderField(
                  "Alternate Contact",
                  "contact.alternateContactNumber",
                  editedLoan?.contact?.alternateContactNumber
                )}
              </Col>
            </Row>
            {renderField("Email", "contact.email", editedLoan?.contact?.email)}

            <Divider orientation="left">Address Info</Divider>
            <Row gutter={16}>
              <Col span={8}>
                {renderField(
                  "Barangay",
                  "address.barangay",
                  editedLoan?.address?.barangay
                )}
              </Col>
              <Col span={8}>
                {renderField("City", "address.city", editedLoan?.address?.city)}
              </Col>
              <Col span={8}>
                {renderField(
                  "Province",
                  "address.province",
                  editedLoan?.address?.province
                )}
              </Col>
            </Row>
            {renderField(
              "Birth Address",
              "BirthAddress",
              editedLoan?.BirthAddress
            )}
            {renderField(
              "Work Address",
              "WorkAddress",
              editedLoan?.WorkAddress
            )}

            <Divider orientation="left">Spouse Info</Divider>
            <Row gutter={16}>
              <Col span={8}>
                {renderField(
                  "Spouse Last Name",
                  "SpouseLastName",
                  editedLoan?.SpouseLastName
                )}
              </Col>
              <Col span={8}>
                {renderField(
                  "Spouse First Name",
                  "SpouseFirstName",
                  editedLoan?.SpouseFirstName
                )}
              </Col>
              <Col span={8}>
                {renderField(
                  "Spouse Middle Name",
                  "SpouseMiddleName",
                  editedLoan?.SpouseMiddleName
                )}
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                {renderField(
                  "Occupation",
                  "Occupation",
                  editedLoan?.Occupation
                )}
              </Col>
              <Col span={12}>
                {renderField(
                  "Company Name",
                  "CompanyName",
                  editedLoan?.CompanyName
                )}
              </Col>
            </Row>
          </TabPane>

          {/* Loan Info */}
          <TabPane tab="Loan Information" key="2">
            <Divider orientation="left">Loan Records</Divider>
            <Button
              type="primary"
              onClick={() => setIsAddLoanModalVisible(true)}
              style={{ marginBottom: 16 }}
            >
              Add Loan Record
            </Button>
            <Table
              dataSource={mergedLoans}
              columns={loanInfoColumns}
              rowKey={(record) => record._id || `${record.Source}-${record.LoanNo}`}
              pagination={false}
              size="small"
              scroll={{ y: 250 }}
            />
          </TabPane>

          {/* Documents */}
          <TabPane tab="Documents" key="3">
            <p>No document information available.</p>
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
        width={600}
      >
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Loan No", "LoanNo", newLoanRecord.LoanNo, "text", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Loan Type", "LoanType", newLoanRecord.LoanType, "text", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Loan Status", "LoanStatus", newLoanRecord.LoanStatus, "text", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Loan Amount", "LoanAmount", newLoanRecord.LoanAmount, "number", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Loan Balance", "LoanBalance", newLoanRecord.LoanBalance, "number", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Loan Amortization", "LoanAmortization", newLoanRecord.LoanAmortization, "text", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Payment Mode", "PaymentMode", newLoanRecord.PaymentMode, "text", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Start Payment Date", "StartPaymentDate", newLoanRecord.StartPaymentDate, "date", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Maturity Date", "MaturityDate", newLoanRecord.MaturityDate, "date", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Principal Amount", "PrincipalAmount", newLoanRecord.PrincipalAmount, "number", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Loan Interest", "LoanInterest", newLoanRecord.LoanInterest, "number", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Penalty", "Penalty", newLoanRecord.Penalty, "number", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Loan Term", "LoanTerm", newLoanRecord.LoanTerm, "text", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Loan Process Status", "LoanProcessStatus", newLoanRecord.LoanProcessStatus, "text", handleNewLoanRecordChange)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Date Encoded", "Date_Encoded", newLoanRecord.Date_Encoded, "date", handleNewLoanRecordChange)}
          </Col>
          <Col span={12}>
            {renderField("Date Modified", "Date_Modified", newLoanRecord.Date_Modified, "date", handleNewLoanRecordChange)}
          </Col>
        </Row>
        {renderField("Collector Name", "CollectorName", newLoanRecord.CollectorName, "text", handleNewLoanRecordChange)}
      </Modal>
    </Modal>
  );
}
