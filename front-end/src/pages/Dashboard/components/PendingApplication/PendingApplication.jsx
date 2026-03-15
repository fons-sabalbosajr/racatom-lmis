import React, { useEffect, useState } from "react";
import {
  Modal,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Descriptions,
  Divider,
  Card,
  Input,
} from "antd";
import api from "../../../../utils/axios";
import dayjs from "dayjs";
import "./pendingapplication.css";
import LoanApplication from "../LoanApplication/LoanApplication";
import { swalMessage, swalConfirm } from "../../../../utils/swal";

const { Text, Title } = Typography;
const statusColors = {
  "FOR REVIEW": "gold",
  APPROVED: "green",
  REJECTED: "red",
};

const fmtCurrency = (v) => `₱${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtDate = (v) => v ? dayjs(v).format("MM/DD/YYYY") : "N/A";

const PendingApplication = ({ visible, onClose, onCountChange }) => {
  const [loading, setLoading] = useState(false);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reapplyVisible, setReapplyVisible] = useState(false);
  const [reapplyData, setReapplyData] = useState(null);
  const [loanRates, setLoanRates] = useState([]);

  // 🔹 Fetch pending applications
  const fetchPendingApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loan_clients_application/pending");
      if (res.data.success) {
        setPendingApplications(res.data.data);
        if (onCountChange) onCountChange(res.data.data.length); // ✅ send count to Dashboard
      } else {
        swalMessage.error("Failed to load pending applications");
      }
    } catch (err) {
      console.error(err);
      swalMessage.error("Error fetching pending applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLoanRates = async () => {
      try {
        const res = await api.get("/loan_rates");
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setLoanRates(data);
      } catch (err) {
        console.error("Error fetching loan rates", err);
        setLoanRates([]);
      }
    };
    fetchLoanRates();
  }, []);

  useEffect(() => {
    if (visible) fetchPendingApplications();
    else if (onCountChange) onCountChange(pendingApplications.length);
  }, [visible]);

  // 🔹 Approve or reject
  const handleAction = (id, action) => {
    if (action === "reject") {
      let reason = "";

      swalConfirm({
        title: "Reject Loan Application",
        text: "Are you sure you want to reject this loan application?",
        confirmButtonText: "Reject",
        confirmButtonColor: "#ff4d4f",
        cancelButtonText: "Cancel",
        onOk: async () => {
          if (!reason.trim()) {
            swalMessage.warning("Please provide a rejection reason.");
            return Promise.reject();
          }
          try {
            const res = await api.patch(
              `/loan_clients_application/${id}/reject`,
              { reason }
            );
            if (res.data.success) {
              swalMessage.success("Application rejected successfully");
              fetchPendingApplications();
              setSelected(null);
            }
          } catch (err) {
            console.error(err);
            swalMessage.error("Failed to reject application");
          }
        },
      });
    } else if (action === "approve") {
      // existing approve logic
      swalConfirm({
        title: "Approve Loan Application",
        text: "Are you sure you want to approve this application?",
        confirmButtonText: "Approve",
        onOk: async () => {
          try {
            const res = await api.patch(
              `/loan_clients_application/${id}/approve`
            );
            if (res.data.success) {
              swalMessage.success("Application approved");
              fetchPendingApplications();
              setSelected(null);
            }
          } catch (err) {
            console.error(err);
            swalMessage.error("Failed to approve");
          }
        },
      });
    }
  };

  // 🔹 Table columns
  const columns = [
    {
      title: "Account ID",
      dataIndex: "AccountId",
      key: "AccountId",
    },
    {
      title: "Name",
      render: (_, r) => `${r.FirstName} ${r.LastName}`,
    },
    {
      title: "Contact",
      dataIndex: "ContactNo",
    },
    {
      title: "Loan Amount",
      dataIndex: "LoanAmount",
      render: (val) =>
        `₱${Number(val).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`,
    },
    {
      title: "Terms",
      dataIndex: "LoanTerms",
    },
    {
      title: "Mode",
      dataIndex: "PaymentMode",
    },
    {
      title: "Status",
      dataIndex: "LoanStatus",
      render: (val) => <Tag color={statusColors[val] || "default"}>{val}</Tag>,
    },
    {
      title: "Action",
      render: (_, record) => {
        if (record.LoanStatus === "REJECTED") {
          return (
            <Button
              type="link"
              onClick={() => {
                setReapplyData(record);
                setReapplyVisible(true);
              }}
            >
              Reapply
            </Button>
          );
        }
        return (
          <Button type="link" onClick={() => setSelected(record)}>
            View Details
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Modal
        title="Pending Loan Applications"
        open={visible}
        onCancel={onClose}
        width={1000}
        footer={null}
        destroyOnHidden
      >
        {/* 📋 Table view */}
        {!selected ? (
          <Table
            dataSource={pendingApplications}
            columns={columns}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 5 }}
          />
        ) : (
          <>
            {/* 🔹 Header with Title + Status + Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Space align="center">
                <Title level={5} style={{ margin: 0 }}>
                  Application Details
                </Title>
                <Tag
                  color={statusColors[selected.LoanStatus] || "default"}
                  style={{ fontSize: 12, padding: "2px 8px" }}
                >
                  {selected.LoanStatus}
                </Tag>
              </Space>

              <Space>
                <Button onClick={() => setSelected(null)}>Back</Button>
                <Button
                  type="primary"
                  className="reject-btn"
                  danger
                  onClick={() => handleAction(selected._id, "reject")}
                >
                  Reject
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleAction(selected._id, "approve")}
                >
                  Approve
                </Button>
              </Space>
            </div>

            <Card bordered={false} style={{ marginBottom: 16 }}>
              {/* Personal Info */}
              <Descriptions bordered size="small" column={2} title="Personal Information">
                <Descriptions.Item label="Account ID">{selected.AccountId}</Descriptions.Item>
                <Descriptions.Item label="Application Date">{fmtDate(selected.ApplicationDate || selected.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Full Name" span={2}>
                  {[selected.FirstName, selected.MiddleName, selected.LastName, selected.NameSuffix].filter(Boolean).join(" ")}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">{fmtDate(selected.DateOfBirth)}</Descriptions.Item>
                <Descriptions.Item label="Age">{selected.Age || "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Contact">{selected.ContactNo}</Descriptions.Item>
                <Descriptions.Item label="Alt. Contact">{selected.AlternateContactNo || "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Email">{selected.Email || "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Address">{selected.CurrentAddress || "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Occupation">{selected.Occupation || "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Work Address">{selected.OccupationAddress || "N/A"}</Descriptions.Item>
              </Descriptions>

              {/* Co-Maker */}
              {selected.CoMaker?.Name && (
                <>
                  <Divider />
                  <Descriptions bordered size="small" column={2} title="Co-Maker Information">
                    <Descriptions.Item label="Name">{selected.CoMaker.Name}</Descriptions.Item>
                    <Descriptions.Item label="Relationship">{selected.CoMaker.Relationship || "N/A"}</Descriptions.Item>
                    <Descriptions.Item label="Contact">{selected.CoMaker.ContactNo || "N/A"}</Descriptions.Item>
                    <Descriptions.Item label="Address">{selected.CoMaker.Address || "N/A"}</Descriptions.Item>
                  </Descriptions>
                </>
              )}

              {/* Previous Loan */}
              {selected.LoanRecord && selected.PreviousLoan && (
                <>
                  <Divider />
                  <Descriptions bordered size="small" column={2} title="Previous Loan Record">
                    <Descriptions.Item label="Record">{selected.PreviousLoan.Record || "N/A"}</Descriptions.Item>
                    <Descriptions.Item label="Date">{fmtDate(selected.PreviousLoan.Date)}</Descriptions.Item>
                    <Descriptions.Item label="Amount">{fmtCurrency(selected.PreviousLoan.Amount)}</Descriptions.Item>
                    <Descriptions.Item label="Status">{selected.PreviousLoan.Status || "N/A"}</Descriptions.Item>
                  </Descriptions>
                </>
              )}

              <Divider />

              {/* Loan Info */}
              <Descriptions bordered size="small" column={2} title="Loan Information">
                <Descriptions.Item label="Loan Amount">{fmtCurrency(selected.LoanAmount)}</Descriptions.Item>
                <Descriptions.Item label="Loan Terms">{selected.LoanTerms}</Descriptions.Item>
                <Descriptions.Item label="Payment Mode">{selected.PaymentMode}</Descriptions.Item>
                <Descriptions.Item label="Processing Fee">{fmtCurrency(selected["Processing Fee"])}</Descriptions.Item>
                <Descriptions.Item label="Interest Rate/Month">{selected["Interest Rate/Month"] != null ? `${selected["Interest Rate/Month"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Penalty Rate">{selected["Penalty Rate"] != null ? `${selected["Penalty Rate"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Notarial Rate">{selected["Notarial Rate"] != null ? `${selected["Notarial Rate"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Annotation Rate">{selected["Annotation Rate"] != null ? `${selected["Annotation Rate"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Insurance Rate">{selected["Insurance Rate"] != null ? `${selected["Insurance Rate"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="VAT Rate">{selected["Vat Rate"] != null ? `${selected["Vat Rate"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Doc Rate">{selected["Doc Rate"] != null ? `${selected["Doc Rate"]}%` : "N/A"}</Descriptions.Item>
                <Descriptions.Item label="Misc. Rate">{selected["Misc. Rate"] != null ? `${selected["Misc. Rate"]}%` : "N/A"}</Descriptions.Item>
              </Descriptions>

              {/* Rejection info */}
              {selected.LoanStatus === "REJECTED" && (
                <>
                  <Divider />
                  <Descriptions bordered size="small" column={1} title="Rejection Details">
                    <Descriptions.Item label="Reason">{selected.RejectionReason || "No reason provided"}</Descriptions.Item>
                    <Descriptions.Item label="Rejected At">{fmtDate(selected.RejectedAt)}</Descriptions.Item>
                  </Descriptions>
                </>
              )}

              <Divider />

              {/* Uploaded Documents */}
              <Title level={5}>Uploaded Documents</Title>
              {selected.UploadedDocs && selected.UploadedDocs.length > 0 ? (
                <ul>
                  {selected.UploadedDocs.map((file, idx) => (
                    <li key={idx}>
                      <Text>{file.name || file.filename}</Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">No documents uploaded.</Text>
              )}
            </Card>
          </>
        )}
      </Modal>

      <LoanApplication
        visible={reapplyVisible}
        onClose={() => setReapplyVisible(false)}
        api={api}
        loanRates={loanRates}
        mode="reapply"
        initialData={reapplyData}
      />
    </>
  );
};

export default PendingApplication;
