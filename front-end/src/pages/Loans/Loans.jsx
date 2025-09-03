import React from "react";
import { Card, Typography } from "antd";

const { Title } = Typography;

function Loans() {
  return (
    <Card className="home-card">
      <Title level={3}>Loans</Title>
      <p>Here you can manage loan applications and statuses.</p>
    </Card>
  );
}

export default Loans;
