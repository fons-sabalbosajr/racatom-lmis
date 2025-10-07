import React, { useState, useEffect } from 'react';
import { Table, Button, message, Input, Row, Col, Card, Tag } from 'antd';
import api from '../../../utils/axios';
import ExportCollectionPDF from '../../../utils/ExportCollectionPDF';

const { Search } = Input;

const StatementofAccounts = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchLoans = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await api.get('/loans', {
        params: {
          page,
          limit: pageSize,
          q: filters.search,
        },
      });
      if (response.data.success) {
        setLoans(response.data.data);
        setPagination({
          current: response.data.meta.page,
          pageSize: response.data.meta.limit,
          total: response.data.meta.total,
        });
      } else {
        message.error('Failed to fetch loans');
      }
    } catch (error) {
      message.error('An error occurred while fetching loans');
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoans();
  }, [filters]);

  const handleTableChange = (pagination) => {
    fetchLoans(pagination.current, pagination.pageSize);
  };

  const generateStatementOfAccount = async (record) => {
    try {
      message.loading({ content: "Generating PDF...", key: "pdf" });
      const res = await api.get(`/loan-collections/${record.loanInfo.loanNo}`, {
        params: { limit: 0 },
      });
      if (res.data.success) {
        if (res.data.data && res.data.data.length > 0) {
          ExportCollectionPDF(record, res.data.data);
          message.success({
            content: "PDF Generated!",
            key: "pdf",
            duration: 2,
          });
        } else {
          message.info({
            content: "No collections found for this account.",
            key: "pdf",
            duration: 3,
          });
        }
      } else {
        message.error({
          content: "Failed to fetch collection data.",
          key: "pdf",
        });
      }
    } catch (error) {
      console.error("Error generating statement of account:", error);
      message.error({ content: "Failed to generate PDF.", key: "pdf" });
    }
  };

  const STATUS_COLORS = {
    UPDATED: "green",
    UPDATE: "green",
    ARREARS: "orange",
    "PAST DUE": "red",
    LITIGATION: "volcano",
    DORMANT: "grey",
    CLOSED: "default",
    Approved: "blue",
    Pending: "gold",
    Released: "purple",
    "Loan Released": "purple",
    'LOAN APPROVED': 'green',
    'PAID': 'blue',
    'DEFAULT': 'red',
    'PENDING': 'orange',
    'ACTIVE': 'cyan',
  };

  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || 'default';
  }

  const columns = [
    {
      title: 'Loan & Client No',
      key: 'loanNo',
      sorter: (a, b) => a.loanInfo.clientNo.localeCompare(b.loanInfo.clientNo),
      render: (_, record) => (
          <div>
              <div>{record.loanInfo.loanNo}</div>
              <div style={{ fontSize: '12px', color: 'gray' }}>{record.loanInfo.clientNo}</div>
          </div>
      )
    },
    {
      title: 'Client Name & Address',
      key: 'clientName',
      render: (_, record) => (
          <div>
              <div>{record.fullName}</div>
              <div style={{ fontSize: '12px', color: 'gray' }}>{[record.address.barangay, record.address.city, record.address.province].filter(Boolean).join(', ')}</div>
          </div>
      )
    },
    {
        title: 'Loan Information',
        key: 'loanInfo',
        render: (_, record) => (
            <div>
                <div><strong>Amount:</strong> {record.loanInfo.amount?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</div>
                <div><strong>Balance:</strong> {record.loanInfo.balance?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</div>
                <div><strong>Maturity:</strong> {new Date(record.loanInfo.maturityDate).toLocaleDateString()}</div>
            </div>
        ),
    },
    {
      title: 'Status',
      dataIndex: ['loanInfo', 'status'],
      key: 'status',
      sorter: (a, b) => {
        const order = { 'UPDATE': 1, 'DORMANT': 2 };
        const statusA = a.loanInfo.status;
        const statusB = b.loanInfo.status;
        const orderA = order[statusA] || 3;
        const orderB = order[statusB] || 3;
    
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return statusA.localeCompare(statusB);
      },
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => generateStatementOfAccount(record)}
        >
          Generate SOA
        </Button>
      ),
    },
  ];

  return (
    <Card title="Statement of Accounts">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col>
          <Search
            placeholder="Search by Loan No or Client Name"
            onSearch={(value) => setFilters({ ...filters, search: value })}
            style={{ width: 300 }}
            allowClear
          />
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={loans}
        rowKey="_id"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
      />
    </Card>
  );
};

export default StatementofAccounts;