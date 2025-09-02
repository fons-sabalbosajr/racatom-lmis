// src/pages/Settings/Settings.jsx
import React from "react";
import { Card, Typography } from "antd";

const { Title, Text } = Typography;

function Settings() {
  return (
    <Card style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
      <Title level={3}>Settings</Title>
      <Text>Update system preferences and account settings here.</Text>
    </Card>
  );
}

export default Settings;
