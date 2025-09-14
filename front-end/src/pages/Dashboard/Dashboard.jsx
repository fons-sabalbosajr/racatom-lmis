import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, List, message } from 'antd';
import { UserOutlined, TransactionOutlined, ScheduleOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../utils/axios';
import './dashboard.css';

const { Title, Text } = Typography;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function Dashboard() {
  const [stats, setStats] = useState({ totalLoans: 0, totalDisbursed: 0, upcomingPayments: 0, averageLoanAmount: 0 });
  const [chartData, setChartData] = useState([]);
  const [loanTypeData, setLoanTypeData] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/loans?limit=10000'); // Fetch a large number of loans to calculate stats
        if (res.data.success) {
          const loans = res.data.data;

          // Calculate stats
          const totalLoans = loans.length;
          const totalDisbursed = loans.reduce((acc, loan) => acc + (loan.netProceeds || 0), 0);
          const upcomingPayments = loans.filter(loan => new Date(loan.dueDate) > new Date()).length; // Example logic
          const totalLoanAmount = loans.reduce((acc, loan) => acc + (loan.LoanAmount || 0), 0);
          const averageLoanAmount = totalLoans > 0 ? totalLoanAmount / totalLoans : 0;

          setStats({ totalLoans, totalDisbursed, upcomingPayments, averageLoanAmount });

          // Prepare data for the bar chart
          const statusCounts = loans.reduce((acc, loan) => {
            const status = loan.LoanStatus || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});

          const chartData = Object.keys(statusCounts).map(status => ({
            name: status,
            count: statusCounts[status],
          }));
          setChartData(chartData);

          // Prepare data for the pie chart
          const loanTypeCounts = loans.reduce((acc, loan) => {
            const type = loan.LoanType || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});

          const loanTypeData = Object.keys(loanTypeCounts).map(type => ({
            name: type,
            value: loanTypeCounts[type],
          }));
          setLoanTypeData(loanTypeData);

          // Set recent loans
          setRecentLoans(loans.slice(0, 5));
        } else {
          message.error('Failed to load dashboard data');
        }
      } catch (err) {
        console.error(err);
        message.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <Title level={2} className="dashboard-title">Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card">
            <Statistic
              title="Total Loans"
              value={stats.totalLoans}
              precision={0}
              loading={loading}
              valueStyle={{ color: '#3f8600' }}
              prefix={<TransactionOutlined />}
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
              valueStyle={{ color: '#cf1322' }}
              prefix="₱"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card">
            <Statistic
              title="Upcoming Payments"
              value={stats.upcomingPayments}
              precision={0}
              loading={loading}
              valueStyle={{ color: '#d48806' }}
              prefix={<ScheduleOutlined />}
              suffix="payments"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card">
            <Statistic
              title="Average Loan Amount"
              value={stats.averageLoanAmount}
              precision={2}
              loading={loading}
              valueStyle={{ color: '#1890ff' }}
              prefix="₱"
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} md={16}>
          <Card className="dashboard-card chart-card">
            <Title level={4}>Loan Status Overview</Title>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="dashboard-card chart-card">
            <Title level={4}>Loans by Type</Title>
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {
                    loanTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
                  }
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24}>
          <Card className="dashboard-card recent-applications-card">
            <Title level={4}>Recent Loan Applications</Title>
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={recentLoans}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<UserOutlined />}
                    title={<a href="#">{`${item.FirstName} ${item.LastName}`}</a>}
                    description={`Applied for a loan of ₱${item.LoanAmount}`}
                  />
                  <Text type={item.LoanStatus === 'Pending' ? 'warning' : item.LoanStatus === 'Approved' ? 'success' : 'danger'}>{item.LoanStatus}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;