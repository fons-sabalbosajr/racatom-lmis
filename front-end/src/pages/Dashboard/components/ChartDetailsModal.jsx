import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, message, Pagination, Row, Col, Select, Tag, Button, Space } from 'antd';
import api from '../../../utils/axios';
import { getLoanStatusColor } from '../../../utils/statusColors';



function ChartDetailsModal({ visible, onClose, title, filter, onViewLoan }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pageSizeOptions: ['10', '20', '50', '100'] });

  const fmtCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (date) => (date ? new Date(date).toLocaleDateString() : '—');

  const getDynamicColumns = () => {
    const coreColumns = [
      {
        title: 'Applicant',
        dataIndex: 'fullName',
        key: 'applicant',
        render: (text, record) => (
          <div>
            <div>{text || '—'}</div>
            <div style={{ fontSize: '0.85em', color: '#888' }}>Loan No: {record.loanInfo?.loanNo || '—'}</div>
            <div style={{ fontSize: '0.85em', color: '#888' }}>Client No: {record.clientNo || '—'}</div>
          </div>
        ),
      },
      {
        title: 'Loan Amount',
        dataIndex: ['loanInfo', 'amount'],
        key: 'amount',
        render: (val) => fmtCurrency(val),
      },
      {
        title: 'Loan Balance',
        dataIndex: ['loanInfo', 'balance'],
        key: 'balance',
        render: (val) => fmtCurrency(val),
      },
      {
        title: 'Payment Mode',
        dataIndex: ['loanInfo', 'paymentMode'],
        key: 'paymentMode',
        render: (val) => val || '—',
      },
    ];

    const statusColumn = {
      title: 'Status',
      dataIndex: ['loanInfo', 'status'],
      key: 'status',
      render: (status) => {
        return <Tag color={getLoanStatusColor(status)}>{status || '—'}</Tag>;
      },
    };

    const dueDateColumn = {
      title: 'Due Date',
      dataIndex: ['loanInfo', 'maturityDate'],
      key: 'dueDate',
      render: (date) => fmtDate(date),
    };

    const typeSpecificColumns = [];
    if (title.startsWith('Loans with Type:')) {
      typeSpecificColumns.push(
        {
          title: 'Loan Type',
          dataIndex: ['loanInfo', 'type'],
          key: 'type',
          render: (v) => v || '—',
        },
        {
          title: 'Start Payment Date',
          dataIndex: ['loanInfo', 'startPaymentDate'],
          key: 'startPaymentDate',
          render: (date) => fmtDate(date),
        }
      );
    } else if (title.startsWith('Loans for Collector:')) {
      return [
        ...coreColumns,
        {
          title: 'Collector',
          dataIndex: ['loanInfo', 'collectorName'],
          key: 'collectorName',
          render: (v) => v || '—',
        },
        {
          title: 'Loan Type',
          dataIndex: ['loanInfo', 'type'],
          key: 'type',
          render: (v) => v || '—',
        },
        {
          title: 'Start Payment Date',
          dataIndex: ['loanInfo', 'startPaymentDate'],
          key: 'startPaymentDate',
          render: (date) => fmtDate(date),
        },
        dueDateColumn,
        statusColumn,
        {
          title: 'Action',
          key: 'action',
          fixed: 'right',
          render: (_, record) => (
            <Space>
              <Button type="link" onClick={() => onViewLoan && onViewLoan(record)}>View Details</Button>
            </Space>
          ),
        },
      ];
    }

    return [...coreColumns, ...typeSpecificColumns, dueDateColumn, statusColumn, {
      title: 'Action', key: 'action', fixed: 'right', render: (_, record) => (
        <Space>
          <Button type='link' onClick={() => onViewLoan && onViewLoan(record)}>View Details</Button>
        </Space>
      ) }];
  };

  const fetchLoans = useCallback(async (page, limit) => {
    if (!filter) return;
    setLoading(true);
    try {
  // Default sorting; if upcoming filter active, sort by soonest due
  const params = { page, limit, sortBy: filter?.upcoming ? 'MaturityDate' : 'StartPaymentDate', sortDir: filter?.upcoming ? 'asc' : 'desc' };
      // Special handling for collectorName array
      if (filter.collectorName) {
        params.collectorName = Array.isArray(filter.collectorName)
          ? filter.collectorName.join(',')
          : filter.collectorName;
      }
      // Pass through other filters
      Object.keys(filter).forEach((k) => {
        if (k !== 'collectorName') params[k] = filter[k];
      });

      const response = await api.get('/loans', { params });
      if (response.data.success) {
        setLoans(response.data.data);
        setMeta({
          page: Number(response.data.meta.page) || 1,
          limit: Number(response.data.meta.limit) || 10,
          total: Number(response.data.meta.total) || 0,
          pageSizeOptions: meta.pageSizeOptions, // Keep existing options
        });
      } else {
        message.error('Failed to load loan details.');
      }
    } catch (error) {
      message.error('An error occurred while fetching loan details.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filter, meta.pageSizeOptions]) // Added meta.pageSizeOptions to dependency array

  useEffect(() => {
    if (visible) {
      fetchLoans(meta.page, meta.limit);
    }
  }, [visible, fetchLoans, meta.page, meta.limit]);

  const handleTableChange = (page, pageSize) => {
    fetchLoans(page, pageSize);
  };


  return (
    <Modal
      title={title}
      visible={visible}
      onCancel={onClose}
      footer={null}
      width="80%"
      style={{ top: 20 }}
    >
      <Table
        columns={getDynamicColumns()}
        dataSource={loans}
        loading={loading}
        rowKey="_id"
        pagination={false}
        scroll={{ y: 400 }}
      />
      <Row justify="space-between" align="middle" style={{ marginTop: 16 }}>
        <Col>
          {title.startsWith('Loans for Collector:') && `Total Loans for ${title.substring('Loans for Collector:'.length).trim()}: `}
          {title.startsWith('Loans with Type:') && `Total Loans with Type ${title.substring('Loans with Type:'.length).trim()}: `}
          {title.startsWith('Loans with Status:') && `Total Loans with Status ${title.substring('Loans with Status:'.length).trim()}: `}
          {!title.startsWith('Loans for Collector:') && !title.startsWith('Loans with Type:') && !title.startsWith('Loans with Status:') && 'Total Loans: '}
          <strong>{meta.total}</strong>
        </Col>
        <Col>
          <Pagination
            current={meta.page}
            pageSize={meta.limit}
            total={meta.total}
            onChange={handleTableChange}
            showSizeChanger={false} // Disable default size changer
          />
        </Col>
        <Col>
          <Select
            value={meta.limit}
            onChange={(size) => handleTableChange(1, size)} // Reset to page 1 when page size changes
            style={{ width: 120 }}
          >
            {meta.pageSizeOptions.map((option) => (
              <Select.Option key={option} value={Number(option)}>
                {`${option} / page`}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>
    </Modal>
  );
}

export default ChartDetailsModal;
