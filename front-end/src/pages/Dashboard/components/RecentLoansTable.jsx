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
import "./RecentLoansTable.css";

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
    // console.log(`Total rows loaded in table: ${recentLoans.length}`);
  }, [recentLoans]);

  const columns = [
    {
      title: "Applicant",
      dataIndex: "fullName",
      key: "applicant",
      width: 200,
      render: (text, record) => {
        const name =
          text ||
          `${record.person?.firstName || ""} ${
            record.person?.middleName || ""
          } ${record.person?.lastName || ""}`.trim();
        return (
          <div>
            <div>{name}</div>
            {record.loanInfo?.loanNo && (
              <div style={{ fontSize: "0.85em", color: "#888" }}>
                Loan No: {record.loanInfo.loanNo}
              </div>
            )}
            {record.clientNo && (
              <div style={{ fontSize: "0.85em", color: "#888" }}>
                Client No: {record.clientNo}
              </div>
            )}
          </div>
        );
      },
    },

    {
      title: "Loan Amount",
      dataIndex: ["loanInfo", "amount"],
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
      title: "Loan Balance",
      dataIndex: ["loanInfo", "balance"],
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
      dataIndex: ["loanInfo", "penalty"],
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
      dataIndex: ["loanInfo", "status"],
      key: "status",
      render: (status) => <Tag color={statusColor(status)}>{status}</Tag>,
      sorter: true,
      sortOrder: sort?.sortBy === "LoanStatus" && "ascend",
    },
    {
      title: "Due Date",
      key: "dueDate",
      width: 120,
      align: "center",
      sorter: true,
      render: (_, record) => {
        const rawDate =
          record.loanInfo?.maturityDate ||
          record.MaturityDate ||
          record.maturityDate;
        return rawDate ? new Date(rawDate).toLocaleDateString() : "—";
      },
      sortOrder:
        sort?.sortBy === "MaturityDate"
          ? sort?.sortDir === "asc"
            ? "ascend"
            : "descend"
          : undefined,
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

  const applySearch = (value) => {
    handleTableChange(
      { current: 1, pageSize: meta.limit },
      { searchTerm: value },
      {}
    );
  };

  const onInputChange = (e) => setSearchTerm(e.target.value);
  const onPressEnter = () => applySearch(searchTerm);

  // keep these helpers available for other callers; linter may flag unused ones elsewhere
  const applyFilters = () =>
    handleTableChange({ current: 1, pageSize: meta.limit }, { searchTerm }, {});
  const clearFilters = () => {
    setSearchTerm("");
    handleTableChange({ current: 1, pageSize: meta.limit }, {}, {});
  };

  const getFilters = () => ({ searchTerm });
  const onTableChange = (pagination, antdFilters, sorter) =>
    handleTableChange(pagination, getFilters(), sorter);

  return (
    <Col xs={24}>
      <Card
        className="dashboard-card recent-applications-card"
        title="Recent Loan Applications"
        extra={
          <div className="recent-loans-extra">
            <Input
              placeholder="Search loans..."
              value={searchTerm}
              onChange={onInputChange}
              onPressEnter={onPressEnter}
              allowClear
              className="recent-loans-search"
            />
          </div>
        }
      >
        <div className="recent-loans-wrapper">
          <Table
            className="recent-loans-table"
            columns={columns}
            dataSource={recentLoans}
            loading={loading}
            rowKey={(record) => record._id}
            pagination={false}
            onChange={(pagination, filters, sorter) =>
              handleTableChange(pagination, { searchTerm }, sorter)
            }
            size="small"
            scroll={{ x: "max-content", y: 250 }}
          />

          <div className="recent-loans-footer">
            <Row justify="space-between" align="middle">
              <Col>
                <span className="total-accounts">Total Loan Accounts: </span>
                <strong className="total-value">{meta.total}</strong>
              </Col>
              <Col>
                <Pagination
                  current={meta.page}
                  pageSize={meta.limit}
                  total={meta.total}
                  showSizeChanger={false}
                  onChange={(page, pageSize) =>
                    handleTableChange(
                      { current: page, pageSize },
                      { searchTerm },
                      {}
                    )
                  }
                />
              </Col>
              <Col>
                <Select
                  value={meta.limit}
                  onChange={(size) =>
                    handleTableChange(
                      { current: 1, pageSize: size },
                      { searchTerm },
                      {}
                    )
                  }
                  style={{ width: 120 }}
                >
                  {meta.pageSizeOptions?.map((option) => (
                    <Select.Option key={option} value={Number(option)}>
                      {`${option} / page`}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </div>
        </div>
      </Card>
    </Col>
  );
}

export default RecentLoansTable;
