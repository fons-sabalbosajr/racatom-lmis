import React from "react";
import { Card } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#FF8042", "#00C49F", "#0088FE", "#FFBB28", "#AF19FF", "#848484"];

// Helper to convert string to Title Case
const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Mapping for known name variations
const nameMap = {
  "OFFICE": "Office",
  "OFFICE 1": "Office",
  "RCT OFFICE": "Office",
  "CHRIS ALVIN SANCHEZ SESE": "Chris Alvin Sese",
  "SESE CHRIS ALVIN": "Chris Alvin Sese",
  "SESES CHRIS ALVIN": "Chris Alvin Sese",
  "RELLY DE JESUS MERCADO JR.": "Relly De Jesus Mercado Jr.",
  "RELLY": "Relly De Jesus Mercado Jr.",
  "SESE ALVIN": "Alvin Sese",
  "ALVIN": "Alvin Sese",
};

// Function to get a canonical name for a collector
const getCanonicalName = (name) => {
  const upperName = name.trim().toUpperCase();
  return nameMap[upperName] || toTitleCase(name);
};

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

function LoanCollectorChart({ loanCollectorData, onDataClick }) {
  // Process data to filter invalid names and merge similar ones
  const processedData = loanCollectorData.reduce((acc, entry) => {
    const name = entry.name;
    if (!name || name.toLowerCase().includes("--select collector--") || name.toLowerCase() === "value") {
      return acc;
    }
    const canonicalName = getCanonicalName(name);
    const existingEntry = acc.find((p) => p.name === canonicalName);
    if (existingEntry) {
      existingEntry.value += entry.value;
      existingEntry.originalNames.push(name);
    } else {
      acc.push({ name: canonicalName, value: entry.value, originalNames: [name] });
    }
    return acc;
  }, []);

  // Sort and group into 'Top N' and 'Others'
  const sortedData = processedData.sort((a, b) => b.value - a.value);
  const topN = 5; // Show Top 5 and Others
  let finalData;

  if (sortedData.length > topN) {
    const topItems = sortedData.slice(0, topN);
    const otherSlice = sortedData.slice(topN);
    const otherValue = otherSlice.reduce((acc, item) => acc + item.value, 0);
    const otherOriginalNames = otherSlice.flatMap(item => item.originalNames);
    finalData = [
      ...topItems,
      { name: 'Others', value: otherValue, originalNames: otherOriginalNames },
    ];
  } else {
    finalData = sortedData;
  }

  const handlePieClick = (data) => {
    if (!onDataClick) return;

    // Always send originalNames for filtering
    const filter = { collectorName: data.originalNames };
    
    const title = `Loans for Collector: ${data.name}`;
    onDataClick(filter, title);
  };

  return (
    <Card className="dashboard-card chart-card" title="Loans by Collector">
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
                style={{ cursor: 'pointer' }}
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

export default LoanCollectorChart;
