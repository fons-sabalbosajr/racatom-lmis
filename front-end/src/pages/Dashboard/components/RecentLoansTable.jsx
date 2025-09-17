import React from "react";
import { Table, Tag, Button, Col, Pagination, Card, Row } from "antd";
import { EyeOutlined } from "@ant-design/icons";

// Status color logic from LoanColumns.jsx
const statusColor = (status) => {
  if (!status) return "default";
  if (status.toLowerCase().includes("updated")) return "green";
  if (status.toLowerCase().includes("pending")) return "orange";
  if (status.toLowerCase().includes("rejected")) return "red";
  return "blue";
};

function RecentLoansTable({
  recentLoans,
  loading,
  meta,
  handleTableChange,
  viewLoan,
}) {
  const columns = [
    {
      title: "Applicant",
      dataIndex: "fullName",
      key: "applicant",
    },
    {
      title: "Loan Amount",
      dataIndex: "LoanAmount",
      key: "amount",
      render: (val) => {
        if (val === undefined || val === null || val === "") {
          return "₱0.00";
        }
        const numericVal = Number(String(val).replace(/[₱,]/g, ""));
        return `₱${numericVal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      title: "Loan Amortization",
      dataIndex: "LoanAmortization",
      key: "amortization",
      render: (val) => {
        if (val === undefined || val === null || val === "") {
          return "₱0.00";
        }
        const numericVal = Number(String(val).replace(/[₱,]/g, ""));
        return `₱${numericVal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      title: "Loan Balance",
      dataIndex: "LoanBalance",
      key: "balance",
      render: (val) => {
        if (val === undefined || val === null || val === "") {
          return "₱0.00";
        }
        const numericVal = Number(String(val).replace(/[₱,]/g, ""));
        return `₱${numericVal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      title: "Penalty",
      dataIndex: "Penalty",
      key: "penalty",
      render: (val) => {
        if (val === undefined || val === null || val === "") {
          return "₱0.00";
        }
        const numericVal = Number(String(val).replace(/[₱,]/g, ""));
        return `₱${numericVal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      title: "Loan Interest",
      dataIndex: "LoanInterest",
      key: "interest",
      render: (val) => {
        if (val === undefined || val === null || val === "") {
          return "₱0.00";
        }
        const numericVal = Number(String(val).replace(/[₱,]/g, ""));
        return `₱${numericVal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      title: "Status",
      dataIndex: "LoanStatus",
      key: "status",
      render: (status) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: "Due Date",
      dataIndex: "MaturityDate",
      key: "dueDate",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "—"),
      sorter: (a, b) => {
        const dateA = a.MaturityDate
          ? new Date(a.MaturityDate).getTime()
          : 0;
        const dateB = b.MaturityDate
          ? new Date(b.MaturityDate).getTime()
          : 0;
        return dateB - dateA; // Sort descending (most recent first)
      },
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          type="primary"
          onClick={() => viewLoan(record)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Col xs={24}>
      <Card
        className="dashboard-card recent-applications-card"
        title="Recent Loan Applications"
      >
        <Table
          columns={columns}
          dataSource={recentLoans}
          loading={loading}
          rowKey={(record) => record._id}
          pagination={false}
          size="middle"
          scroll={{ x: "max-content", y: 250 }}
          footer={() => (
            <Row
              justify="space-between"
              align="middle"
              style={{ marginTop: "16px" }}
            >
              <Col>
                Total Loan Accounts: <b>{meta.total}</b>
              </Col>
              <Col>
                <Pagination
                  current={meta.page}
                  pageSize={meta.limit}
                  total={meta.total}
                  onChange={handleTableChange}
                  showSizeChanger
                  pageSizeOptions={["5", "10", "20", "50"]}
                />
              </Col>
            </Row>
          )}
        />
      </Card>
    </Col>
  );
}

export default RecentLoansTable;
