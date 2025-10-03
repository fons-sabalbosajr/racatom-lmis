import React, { useEffect, useState } from "react";
import {
  Modal,
  Table,
  Tag,
  Space,
  Button,
  message,
  Typography,
  Descriptions,
  Divider,
  Card,
  Input,
} from "antd";
import api from "../../../../utils/axios";
import "./pendingApplication.css";
import LoanApplication from "../LoanApplication/LoanApplication";

const { Text, Title } = Typography;
const { confirm } = Modal;

const statusColors = {
  "FOR REVIEW": "gold",
  APPROVED: "green",
  REJECTED: "red",
};

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
        message.error("Failed to load pending applications");
      }
    } catch (err) {
      console.error(err);
      message.error("Error fetching pending applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLoanRates = async () => {
      try {
        const res = await api.get("/loan_rates");
        const data = Array.isArray(res.data) ? res.data : res.data.data || []; // ✅ Extract correct array
        //console.log("✅ loanRates fetched:", data);
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

      confirm({
        title: "Reject Loan Application",
        content: (
          <div>
            <p>Are you sure you want to reject this loan application?</p>
            <Input.TextArea
              placeholder="Please provide a reason for rejection..."
              rows={3}
              onChange={(e) => {
                reason = e.target.value;
              }}
            />
          </div>
        ),
        okText: "Reject",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          if (!reason.trim()) {
            message.warning("Please provide a rejection reason.");
            return Promise.reject();
          }
          try {
            const res = await api.patch(
              `/loan_clients_application/${id}/reject`,
              { reason }
            );
            if (res.data.success) {
              message.success("Application rejected successfully");
              fetchPendingApplications();
              setSelected(null);
            }
          } catch (err) {
            console.error(err);
            message.error("Failed to reject application");
          }
        },
      });
    } else if (action === "approve") {
      // existing approve logic
      Modal.confirm({
        title: "Approve Loan Application",
        content: "Are you sure you want to approve this application?",
        okText: "Approve",
        onOk: async () => {
          try {
            const res = await api.patch(
              `/loan_clients_application/${id}/approve`
            );
            if (res.data.success) {
              message.success("Application approved");
              fetchPendingApplications();
              setSelected(null);
            }
          } catch (err) {
            console.error(err);
            message.error("Failed to approve");
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
        width={selected ? 1000 : 1000}
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
              {/* 🧾 Basic Info */}
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Account ID">
                  {selected.AccountId}
                </Descriptions.Item>
                <Descriptions.Item label="Full Name" span={2}>
                  {selected.FirstName} {selected.LastName}
                </Descriptions.Item>
                <Descriptions.Item label="Contact">
                  {selected.ContactNo}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selected.Email}
                </Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>
                  {selected.CurrentAddress}
                </Descriptions.Item>
                <Descriptions.Item label="Occupation">
                  {selected.Occupation}
                </Descriptions.Item>
                <Descriptions.Item label="Occupation Address">
                  {selected.OccupationAddress}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              {/* 💰 Loan Info */}
              <Descriptions
                bordered
                size="small"
                column={2}
                title="Loan Information"
              >
                <Descriptions.Item label="Loan Amount">
                  ₱
                  {selected.LoanAmount?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Descriptions.Item>
                <Descriptions.Item label="Loan Terms">
                  {selected.LoanTerms}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Mode">
                  {selected.PaymentMode}
                </Descriptions.Item>
                <Descriptions.Item label="Processing Fee">
                  ₱
                  {selected["Processing Fee"]?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Descriptions.Item>
                <Descriptions.Item label="Interest Rate / Month">
                  {selected["Interest Rate/Month"]}%
                </Descriptions.Item>
                <Descriptions.Item label="Penalty Rate">
                  {selected["Penalty Rate"]}%
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              {/* 📎 Uploaded Documents */}
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
