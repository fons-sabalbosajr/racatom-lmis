import React from "react";
import { Button, Card, Col, Row, Statistic, Tooltip } from "antd";
import {
  UserOutlined,
  ScheduleOutlined,
  EyeOutlined,
  DollarOutlined,
  BankOutlined,
  FundOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import "./DashboardStats.css";

function DashboardStats({ stats, loading, onShowUpcoming }) {

  return (
    <>
      {/* Primary stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card stat-gradient stat-gradient-blue">
            <Statistic
              title="Total Loans"
              value={stats.totalLoans}
              precision={0}
              loading={loading}
              valueStyle={{ color: "#fff" }}
              prefix={<UserOutlined />}
              suffix="loans"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card stat-gradient stat-gradient-red">
            <Statistic
              title="Total Disbursed"
              value={stats.totalDisbursed}
              precision={2}
              loading={loading}
              valueStyle={{ color: "#fff" }}
              prefix="₱"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card stat-gradient stat-gradient-orange">
            <div style={{ position: "relative" }}>
              {onShowUpcoming && (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined style={{ color: "#fff" }} />}
                  onClick={onShowUpcoming}
                  style={{ position: "absolute", top: 0, right: 0 }}
                />
              )}
              <Statistic
                title="Upcoming Payments"
                value={stats.upcomingPayments}
                precision={0}
                loading={loading}
                valueStyle={{ color: "#fff" }}
                prefix={<ScheduleOutlined />}
                suffix="accounts"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card stat-gradient stat-gradient-cyan">
            <Statistic
              title="Average Loan"
              value={stats.averageLoanAmount}
              precision={2}
              loading={loading}
              valueStyle={{ color: "#fff" }}
              prefix="₱"
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary stat cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card stat-card-secondary">
            <Statistic
              title="Outstanding Balance"
              value={stats.totalOutstandingBalance}
              precision={2}
              loading={loading}
              valueStyle={{ color: "#cf1322", fontWeight: 700 }}
              prefix={<><BankOutlined style={{ marginRight: 4 }} />₱</>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card stat-card-secondary">
            <Statistic
              title="Total Collected"
              value={stats.totalCollected}
              precision={2}
              loading={loading}
              valueStyle={{ color: "#3f8600", fontWeight: 700 }}
              prefix={<><FundOutlined style={{ marginRight: 4 }} />₱</>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card stat-card-secondary">
            <Tooltip title={`${(stats.collectionRate || 0).toFixed(1)}% of total disbursed has been collected`}>
              <Statistic
                title="Collection Rate"
                value={stats.collectionRate}
                precision={1}
                loading={loading}
                valueStyle={{ color: "#1890ff", fontWeight: 700 }}
                prefix={<CheckCircleOutlined style={{ marginRight: 4 }} />}
                suffix="%"
              />
            </Tooltip>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default DashboardStats;
