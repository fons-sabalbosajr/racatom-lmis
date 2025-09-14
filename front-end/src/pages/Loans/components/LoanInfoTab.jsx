import React from "react";
import { Button, Divider, Table, Space, Typography } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

export default function LoanInfoTab({
  mergedLoans,
  loanInfoColumns,
  setIsAddLoanModalVisible,
  handleEditLoanRecord,
}) {
  const columns = loanInfoColumns.map((col) => {
    if (col.key === "action") {
      return {
        ...col,
        render: (text, record) => (
          <Space size="middle">
            <Button type="primary" onClick={() => handleEditLoanRecord(record)}>
              Edit
            </Button>
            <Button danger>Delete</Button>
          </Space>
        ),
      };
    }
    return col;
  });

  return (
    <>
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
        columns={columns}
        rowKey={(record) => record._id || `${record.Source}-${record.LoanNo}`}
        pagination={false}
        size="small"
        scroll={{ y: 250 }}
      />
    </>
  );
}
