// src/pages/Reports/Reports.jsx
import React from "react";
import { Card, Typography } from "antd";

const { Title, Text } = Typography;

function Reports() {
  return (
    <Card style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
      <Title level={3}>Reports</Title>
      <Text>View reports and analytics of the loan system here.</Text>
    </Card>
  );
}

export default Reports;
