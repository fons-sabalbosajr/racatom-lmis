import React from "react";
import { Card } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function LoanTypeChart({ loanTypeData, onDataClick }) {
  // Process data to merge types with different casing
  const processedData = loanTypeData.reduce((acc, entry) => {
    const normalizedName = entry.name ? entry.name.toUpperCase() : "UNSPECIFIED";
    const existingEntry = acc.find((p) => p.name.toUpperCase() === normalizedName);

    if (existingEntry) {
      existingEntry.value += entry.value;
      if (entry.value > (existingEntry.originalValue || 0)) {
        existingEntry.name = entry.name;
        existingEntry.originalValue = entry.value;
      }
    } else {
      acc.push({
        name: entry.name,
        value: entry.value,
        originalValue: entry.value,
      });
    }
    return acc;
  }, []);

  // Sort and group into 'Top N' and 'Others'
  const sortedData = processedData.sort((a, b) => b.value - a.value);
  const topN = 4; // Show Top 4 and Others
  let finalData;

  if (sortedData.length > topN) {
    const topItems = sortedData.slice(0, topN);
    const otherValue = sortedData.slice(topN).reduce((acc, item) => acc + item.value, 0);
    finalData = [
      ...topItems,
      { name: 'Others', value: otherValue },
    ];
  } else {
    finalData = sortedData;
  }

  const handlePieClick = (data) => {
    if (data.name !== 'Others' && onDataClick) {
      onDataClick({ loanType: data.name }, `Loans with Type: ${data.name}`);
    }
  };

  return (
    <Card className="dashboard-card chart-card" title="Loans by Type">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={finalData}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            onClick={handlePieClick}
          >
            {finalData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                style={{ cursor: entry.name === 'Others' ? 'default' : 'pointer' }}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default LoanTypeChart;
