// src/pages/Settings/Settings.jsx
import React from "react";
import { Card, Typography, Divider } from "antd";
import { Outlet, useLocation } from "react-router-dom";

const { Title, Text } = Typography;

function Settings() {
  const location = useLocation();

  // Check if we are at the base /settings route
  const isBaseSettings = location.pathname === "/settings";

  return (
    <Card
      className="home-card"
      style={{ width: "100%", minHeight: "80vh", display: "flex", flexDirection: "column" }}
    >
      <Title level={3}>Settings</Title>

      {isBaseSettings && (
        <Text>Update system preferences and account settings here.</Text>
      )}

      {/* Divider only shows if viewing a subpage */}
      {!isBaseSettings && <Divider />}

      {/* Nested routes render here */}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </Card>
  );
}

export default Settings;
