// src/pages/Reports/Reports.jsx
import React from "react";
import { Card, Typography } from "antd";

const { Title, Text } = Typography;

function Reports() {
  return (
    <Card className="home-card">
      <Title level={3}>Reports</Title>
      <Text>View reports and analytics of the loan system here.</Text>
    </Card>
  );
}

export default Reports;
