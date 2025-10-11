import React from "react";
import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function Maintenance() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <Title level={3} style={{ marginBottom: 8 }}>We'll be right back</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          The system is under scheduled maintenance. If you believe you should have access, please contact an administrator.
        </Paragraph>
      </Card>
    </div>
  );
}
