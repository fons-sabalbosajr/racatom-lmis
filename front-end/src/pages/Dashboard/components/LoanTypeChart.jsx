import React from "react";
import { Card } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function LoanTypeChart({ loanTypeData }) {
  return (
    <Card className="dashboard-card chart-card" title="Loans by Type">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={loanTypeData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {loanTypeData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default LoanTypeChart;
