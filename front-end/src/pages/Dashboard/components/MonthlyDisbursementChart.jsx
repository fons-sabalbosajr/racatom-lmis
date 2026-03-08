import React from "react";
import { Card } from "antd";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

function MonthlyDisbursementChart({ data }) {
  return (
    <Card className="dashboard-card chart-card" title="Monthly Disbursement Trend">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="disbursedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `₱${v / 1000}k`} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [formatCurrency(value), "Disbursed"]}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="disbursed"
            stroke="#1890ff"
            strokeWidth={2}
            fill="url(#disbursedGradient)"
            name="Disbursed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default MonthlyDisbursementChart;
