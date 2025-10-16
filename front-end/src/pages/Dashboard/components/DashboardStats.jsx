import React, { useEffect } from "react";
import { Card, Col, Row, Statistic, Button } from "antd";
import { UserOutlined, ScheduleOutlined, EyeOutlined } from "@ant-design/icons";
import "./DashboardStats.css";

function DashboardStats({ stats, loading, onShowUpcoming }) {
  useEffect(() => {
    //console.log("DashboardStats props:", { stats, loading });
  }, [stats, loading]);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card className="dashboard-card">
          <Statistic
            title="Total Loans"
            value={stats.totalLoans}
            precision={0}
            loading={loading}
            valueStyle={{ color: "#3f8600" }}
            prefix={<UserOutlined />}
            suffix="loans"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="dashboard-card">
          <Statistic
            title="Total Disbursed"
            value={stats.totalDisbursed}
            precision={2}
            loading={loading}
            valueStyle={{ color: "#cf1322" }}
            prefix="₱"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="dashboard-card">
          <div style={{ position: "relative" }}>
            {onShowUpcoming && (
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={onShowUpcoming}
                style={{ position: "absolute", top: 0, right: 0 }}
              />
            )}
            <Statistic
              title="Upcoming Payments"
              value={stats.upcomingPayments}
              precision={0}
              loading={loading}
              valueStyle={{ color: "#d48806" }}
              prefix={<ScheduleOutlined />}
              suffix="accounts"
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="dashboard-card">
          <Statistic
            title="Average Loan Amount"
            value={stats.averageLoanAmount}
            precision={2}
            loading={loading}
            valueStyle={{ color: "#1890ff" }}
            prefix="₱"
          />
        </Card>
      </Col>
    </Row>
  );
}

export default DashboardStats;
