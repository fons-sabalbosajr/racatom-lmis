import React from "react";
import { Table, Typography } from "antd";

const { Text } = Typography;

export default function LoanInfoTab({ mergedLoans, loanInfoColumns }) {
  return (
    <>
      <Table
        className="loan-info-table"
        dataSource={mergedLoans}
        columns={loanInfoColumns}
        rowKey={(record) => record._id || `${record.Source}-${record.LoanNo}`}
        pagination={false}
        size="small"
        scroll={{ y: 250 }}
        footer={() => (
          <Text italic style={{ fontSize: "11px" }}>
            Total Loan Cycles: {mergedLoans.length}
          </Text>
        )}
      />
    </>
  );
}