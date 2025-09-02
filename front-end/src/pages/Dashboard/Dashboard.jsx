// src/pages/Dashboard/Dashboard.jsx
import React from "react";
import { Card, Typography } from "antd";

const { Title, Text } = Typography;

function Dashboard() {
  return (
    <Card style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
      <Title level={3}>Dashboard</Title>
      <Text>Welcome to the dashboard. Overview of system statistics will appear here.</Text>
    </Card>
  );
}

export default Dashboard;
