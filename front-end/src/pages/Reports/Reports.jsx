// src/pages/Reports/Reports.jsx
import React from "react";
import { Card, Typography } from "antd";
import LoanReportGenerator from "./components/LoanReportGenerator"; // Import the new component

const { Title, Text } = Typography;

function Reports() {
  return (
    <Card className="home-card">
      <LoanReportGenerator /> {/* Render the new component */}
    </Card>
  );
}

export default Reports;