import React, { useEffect, useState } from "react";
import "./LoanTypeChart.css";
import { Card, Popover, Button, Tag } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Compute readable text color based on background color (hex)
  const getReadableTextColor = (hex) => {
    if (!hex || typeof hex !== 'string') return '#fff';
    const c = hex.replace('#', '');
    if (c.length !== 6) return '#fff';
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 186 ? '#000' : '#fff';
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const compact = viewportWidth <= 1080;

  let chartHeight = 300;
  if (viewportWidth <= 1080) chartHeight = 240;
  if (viewportWidth <= 834) chartHeight = 200;
  if (viewportWidth <= 768) chartHeight = 180;
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
    <Card className={`dashboard-card chart-card chart-type ${compact ? 'compact' : ''}`} title="Loans by Type">
      <ResponsiveContainer width="100%" height={chartHeight}>
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
        </PieChart>
      </ResponsiveContainer>

      <div className="chart-legend chart-type-legend">
        {finalData && finalData.length > 0 && (() => {
          const SHOW_ALL_THRESHOLD = 3;
          const maxShown = finalData.length <= SHOW_ALL_THRESHOLD ? finalData.length : 1;
          const shown = finalData.slice(0, maxShown);
          const hidden = finalData.slice(maxShown);
          const singleRow = finalData.length <= SHOW_ALL_THRESHOLD;

          return (
            <div className={`legend-items ${singleRow ? 'legend-single-row' : ''}`}>
              {compact ? (
                <>
                  {shown.map((item, idx) => {
                    const bg = COLORS[idx % COLORS.length];
                    const fg = getReadableTextColor(bg);
                    const valueColor = fg === '#000' ? '#002766' : '#fffffe';
                    return (
                      <Tag
                        key={`legend-${idx}`}
                        className="legend-tag"
                        style={{ background: bg, color: fg, fontWeight: 600 }}
                      >
                        {item.name}: <span className="legend-value" style={{ color: valueColor }}>{item.value}</span>
                      </Tag>
                    );
                  })}
                  {hidden.length > 0 && (
                    <Popover
                      content={(
                        <div className="legend-popover-list">
                          {hidden.map((h, i) => {
                            const bg = COLORS[(maxShown + i) % COLORS.length];
                            const fg = getReadableTextColor(bg);
                            const valueColor = fg === '#000' ? '#002766' : '#fffffe';
                            return (
                              <div key={`hidden-${i}`} className="legend-popover-item">
                                <Tag style={{ background: bg, color: fg, fontWeight: 600 }}>
                                  {h.name}: <span className="legend-value" style={{ color: valueColor }}>{h.value}</span>
                                </Tag>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      trigger="click"
                    >
                      <Tag className="legend-more-tag">+{hidden.length} more</Tag>
                    </Popover>
                  )}
                </>
              ) : (
                // Desktop: show all items as Tags inline (same style as compact)
                finalData.map((item, idx) => {
                  const bg = COLORS[idx % COLORS.length];
                  const fg = getReadableTextColor(bg);
                  const valueColor = fg === '#000' ? '#002766' : '#fffffe';
                  return (
                    <Tag
                      key={`legend-all-${idx}`}
                      className="legend-tag"
                      style={{ background: bg, color: fg, fontWeight: 600 }}
                    >
                      {item.name}: <span className="legend-value" style={{ color: valueColor }}>{item.value}</span>
                    </Tag>
                  );
                })
              )}
            </div>
          );
        })()}
      </div>
    </Card>
  );
}

export default LoanTypeChart;
