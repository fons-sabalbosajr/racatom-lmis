import React from "react";
import { Card } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Function to determine bar color based on loan status
const getStatusColor = (status) => {
  if (!status) return "#1890ff"; // Default blue
  const lowerStatus = status.toLowerCase();

  if (lowerStatus.includes("updated")) return "#52c41a"; // Green for updated/paid
  if (lowerStatus.includes("pending")) return "#faad14"; // Orange for pending
  if (lowerStatus.includes("rejected")) return "#f5222d"; // Red for rejected
  if (lowerStatus.includes("past due")) return "#ff7a45"; // Lighter red/orange for past due
  if (lowerStatus.includes("arrears")) return "#cf1322"; // Darker red for arrears
  if (lowerStatus.includes("litigation")) return "#820014"; // Very dark red for litigation
  if (lowerStatus.includes("dormant")) return "#d9d9d9"; // Grey for dormant

  return "#1890ff"; // Default blue for any other status
};

function LoanStatusChart({ chartData, onDataClick }) {
  const handleBarClick = (data) => {
    if (data && onDataClick) {
      onDataClick({ loanStatus: data.activeLabel }, `Loans with Status: ${data.activeLabel}`);
    }
  };

  return (
    <Card className="dashboard-card chart-card" title="Loan Status Overview">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="No. of Loan Applications">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} style={{ cursor: 'pointer' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default LoanStatusChart;
