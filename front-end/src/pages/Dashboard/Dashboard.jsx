import React from "react";
import { Card, Typography } from "antd";
import "./dashboard.css";

const { Title, Text } = Typography;

function Dashboard() {
  return (
    <Card className="home-card">
      <Title level={3}>Dashboard</Title>
      <Text>Welcome to your dashboard overview.</Text>
    </Card>
  );
}

export default Dashboard;
