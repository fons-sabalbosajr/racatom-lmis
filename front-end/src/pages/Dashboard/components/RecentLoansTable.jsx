import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Col,
  Card,
  Row,
  Pagination,
  Select,
  Input,
} from "antd";
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
  sort,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    //console.log(`Total rows loaded in table: ${recentLoans.length}`);
  }, [recentLoans]);

  const columns = [
    {
      title: "Applicant",
      dataIndex: "fullName",
      key: "applicant",
      width: 200,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.loanNo && <div style={{ fontSize: '0.85em', color: '#888' }}>Loan No: {record.loanNo}</div>}
          {record.clientNo && <div style={{ fontSize: '0.85em', color: '#888' }}>Client No: {record.clientNo}</div>}
        </div>
      ),
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
      title: "Loan Amort.",
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
      title: "Status",
      dataIndex: "LoanStatus",
      key: "status",
      render: (status) => <Tag color={statusColor(status)}>{status}</Tag>,
      sorter: true,
      sortOrder: sort.sortBy === "LoanStatus" && "ascend", // ✅ default
    },
    {
      title: "Due Date",
      dataIndex: "MaturityDate",
      key: "dueDate",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "—"),
      sorter: true,
      sortOrder: sort.sortBy === "MaturityDate" && "descend",
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

  const applyFilters = () => {
    const filters = {
      searchTerm: searchTerm,
    };
    // Reset to first page when applying filters
    handleTableChange({ current: 1, pageSize: meta.limit }, filters, {});
  };

  const clearFilters = () => {
    setSearchTerm("");
    // Apply cleared filters
    handleTableChange({ current: 1, pageSize: meta.limit }, {}, {});
  };

  const getFilters = () => ({
    searchTerm: searchTerm,
  });

  const onTableChange = (pagination, antdFilters, sorter) => {
    handleTableChange(pagination, getFilters(), sorter);
  };

  return (
    <Col xs={24}>
      <Card
        className="dashboard-card recent-applications-card"
        title="Recent Loan Applications"
      >
        <Row
          gutter={[16, 16]}
          style={{ marginBottom: 16, alignItems: "center" }}
        >
          <Col xs={24} sm={24} md={12} lg={6}>
            <Input
              placeholder="Search by keyword"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={applyFilters}
              style={{ width: "100%", height: 32 }}
            />
          </Col>
          <Col xs={24} sm={24} md={12} lg={8}>
            <Button
              type="primary"
              onClick={applyFilters}
              style={{ marginRight: 8 }}
            >
              Apply Search
            </Button>
            <Button onClick={clearFilters}>Clear Search</Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={recentLoans}
          loading={loading}
          rowKey={(record) => record._id}
          pagination={false} // Disable default pagination
          footer={() => (
            <Row justify="space-between" align="middle">
              <Col>
                Total Loan Accounts: <strong>{meta.total}</strong>
              </Col>
              <Col>
                <Pagination
                  current={meta.page}
                  pageSize={meta.limit}
                  total={meta.total}
                  showSizeChanger={false} // Disable default size changer
                  onChange={(page, pageSize) =>
                    onTableChange({ current: page, pageSize }, {}, {})
                  }
                />
              </Col>
              <Col>
                <Select
                  value={meta.limit}
                  onChange={(size) =>
                    onTableChange({ current: 1, pageSize: size }, {}, {})
                  }
                  style={{ width: 120 }}
                >
                  {meta.pageSizeOptions.map((option) => (
                    <Select.Option key={option} value={Number(option)}>
                      {`${option} / page`}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
            </Row>
          )}
          onChange={onTableChange}
          size="middle"
          scroll={{ x: "max-content", y: 250 }}
        />
      </Card>
    </Col>
  );
}

export default RecentLoansTable;
