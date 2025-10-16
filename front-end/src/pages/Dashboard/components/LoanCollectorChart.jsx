import React, { useEffect, useState } from "react";
import "./LoanCollectorChart.css";
import { Card, Popover, Button, Tag } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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
  "Relly De Jesus Mercado Jr.": "RELLY",

};

// Function to get a canonical name for a collector
const getCanonicalName = (name) => {
  const upperName = name.trim().toUpperCase();
  return nameMap[upperName] || toTitleCase(name);
};

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

function LoanCollectorChart({ loanCollectorData, onDataClick }) {
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

  // Move pie slightly down on compact screens so legend below has space
  let pieCy = "45%";
  if (viewportWidth <= 1080) pieCy = "50%";
  if (viewportWidth <= 834) pieCy = "55%";
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
    <Card className={`dashboard-card chart-card chart-collector ${compact ? 'compact' : ''}`} title="Loans by Collector">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={finalData}
            cx="50%"
            cy={pieCy}
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
        </PieChart>
      </ResponsiveContainer>

      {/* Custom compact legend: show first few items and a popover for the rest */}
      <div className="chart-legend chart-collector-legend">
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
                      <Tag key={`legend-${idx}`} className="legend-tag" style={{ background: bg, color: fg, fontWeight: 600 }}>
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
                // Desktop: show first 5 items then a '+N more' popover for the rest
                  (() => {
                  const DESKTOP_SHOW = 5;
                  const desktopShown = finalData.slice(0, DESKTOP_SHOW);
                  const desktopHidden = finalData.slice(DESKTOP_SHOW);
                  return (
                    <>
                      {desktopShown.map((item, idx) => {
                        const bg = COLORS[idx % COLORS.length];
                        const fg = getReadableTextColor(bg);
                        const valueColor = fg === '#000' ? '#002766' : '#fffffe';
                        return (
                          <Tag key={`legend-desktop-${idx}`} className="legend-tag" style={{ background: bg, color: fg, fontWeight: 600 }}>
                            {item.name}: <span className="legend-value" style={{ color: valueColor }}>{item.value}</span>
                          </Tag>
                        );
                      })}
                      {desktopHidden.length > 0 && (
                        <Popover
                          content={(
                            <div className="legend-popover-list">
                              {desktopHidden.map((h, i) => {
                                const bg = COLORS[(DESKTOP_SHOW + i) % COLORS.length];
                                const fg = getReadableTextColor(bg);
                                const valueColor = fg === '#000' ? '#002766' : '#fffffe';
                                return (
                                  <div key={`desktop-hidden-${i}`} className="legend-popover-item">
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
                          <Tag className="legend-more-tag">+{desktopHidden.length} more</Tag>
                        </Popover>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          );
        })()}
      </div>
    </Card>
  );
}

export default LoanCollectorChart;
