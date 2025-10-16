import React, { useEffect, useState } from "react";
import "./LoanStatusChart.css";
import { Card, Popover, Button, Tag } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  // Compute readable text color based on background color (hex)
  const getReadableTextColor = (hex) => {
    if (!hex || typeof hex !== "string") return "#fff";
    const c = hex.replace("#", "");
    if (c.length !== 6) return "#fff";
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 186 ? "#000" : "#fff";
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const compact = viewportWidth <= 1080; // user's tablet max width

  // Choose chart height based on viewport to make cards fit better on tablets
  let chartHeight = 300;
  if (viewportWidth <= 1080) chartHeight = 240;
  if (viewportWidth <= 834) chartHeight = 200;
  if (viewportWidth <= 768) chartHeight = 180;

  const handleBarClick = (data) => {
    if (data && onDataClick) {
      onDataClick(
        { loanStatus: data.activeLabel },
        `Loans with Status: ${data.activeLabel}`
      );
    }
  };

  return (
    <Card
      className={`dashboard-card chart-card chart-status ${
        compact ? "compact" : ""
      }`}
      title="Loan Status Overview"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          {/* Legend removed - custom compact legend below */}
          <Bar dataKey="count" name="No. of Loan Applications">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getStatusColor(entry.name)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-legend chart-status-legend">
        {chartData &&
          chartData.length > 0 &&
          (() => {
            const SHOW_ALL_THRESHOLD = 3;
            const maxShown =
              chartData.length <= SHOW_ALL_THRESHOLD ? chartData.length : 1;
            const shown = chartData.slice(0, maxShown);
            const hidden = chartData.slice(maxShown);
            const singleRow = chartData.length <= SHOW_ALL_THRESHOLD;

            return (
              <div
                className={`legend-items ${
                  singleRow ? "legend-single-row" : ""
                }`}
              >
                {compact ? (
                  <>
                    {shown.map((item, idx) => {
                      const bg = getStatusColor(item.name);
                      const fg = getReadableTextColor(bg);
                      const valueColor = fg === "#000" ? "#002766" : "#fffffe"; // dark navy on light bg, near-white on dark bg
                      return (
                        <Tag
                          key={`legend-${idx}`}
                          className="legend-tag"
                          style={{ background: bg, color: fg, fontWeight: 600 }}
                        >
                          {item.name}:{" "}
                          <span
                            className="legend-value"
                            style={{ color: valueColor }}
                          >
                            {item.count ?? item.value ?? ""}
                          </span>
                        </Tag>
                      );
                    })}
                    {hidden.length > 0 && (
                      <Popover
                        content={
                          <div className="legend-popover-list">
                            {hidden.map((h, i) => {
                              const bg = getStatusColor(h.name);
                              const fg = getReadableTextColor(bg);
                              const valueColor =
                                fg === "#000" ? "#002766" : "#fffffe";
                              return (
                                <div
                                  key={`hidden-${i}`}
                                  className="legend-popover-item"
                                >
                                  <Tag
                                    style={{
                                      background: bg,
                                      color: fg,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {h.name}:{" "}
                                    <span
                                      className="legend-value"
                                      style={{ color: valueColor }}
                                    >
                                      {h.count ?? h.value ?? ""}
                                    </span>
                                  </Tag>
                                </div>
                              );
                            })}
                          </div>
                        }
                        trigger="click"
                      >
                        <Tag className="legend-more-tag">
                          +{hidden.length} more
                        </Tag>
                      </Popover>
                    )}
                  </>
                ) : (
                  // Desktop: render all as Tag components for consistency
                  chartData.map((item, idx) => {
                    const bg = getStatusColor(item.name);
                    const fg = getReadableTextColor(bg);
                    const valueColor = fg === "#000" ? "#002766" : "#fffffe";
                    return (
                      <Tag
                        key={`legend-all-${idx}`}
                        className="legend-tag"
                        style={{ background: bg, color: fg, fontWeight: 600 }}
                      >
                        {item.name}:{" "}
                        <span
                          className="legend-value"
                          style={{ color: valueColor }}
                        >
                          {item.count ?? item.value ?? ""}
                        </span>
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

export default LoanStatusChart;
