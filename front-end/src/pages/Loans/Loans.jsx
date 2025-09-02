// src/pages/Loans/Loans.jsx
import React from "react";
import { Card, Typography } from "antd";

const { Title, Text } = Typography;

function Loans() {
  return (
    <Card style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
      <Title level={3}>Loans</Title>
      <Text>Manage all loan requests and details here.</Text>
    </Card>
  );
}

export default Loans;
