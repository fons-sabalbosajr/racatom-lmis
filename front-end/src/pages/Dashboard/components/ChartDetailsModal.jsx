import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, message, Pagination, Row, Col, Select, Tag } from 'antd';
import api from '../../../utils/axios';

const statusColor = (status) => {
  if (!status) return "default";
  if (status.toLowerCase().includes("updated")) return "green";
  if (status.toLowerCase().includes("pending")) return "orange";
  if (status.toLowerCase().includes("rejected")) return "red";
  return "blue";
};



function ChartDetailsModal({ visible, onClose, title, filter }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pageSizeOptions: ['10', '20', '50', '100'] });

  const getDynamicColumns = () => {
    const coreColumns = [
      {
        title: 'Applicant',
        dataIndex: 'fullName',
        key: 'applicant',
        render: (text, record) => (
          <div>
            <div>{text}</div>
            {record.loanInfo.loanNo && <div style={{ fontSize: '0.85em', color: '#888' }}>Loan No: {record.loanInfo.loanNo}</div>}
            {record.clientNo && <div style={{ fontSize: '0.85em', color: '#888' }}>Client No: {record.clientNo}</div>}
          </div>
        ),
      },
      {
        title: 'Loan Amount',
        dataIndex: ['loanInfo', 'amount'],
        key: 'amount',
        render: (val) => `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      {
        title: 'Loan Balance',
        dataIndex: ['loanInfo', 'balance'],
        key: 'balance',
        render: (val) => `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    ];

    const statusColumn = {
      title: 'Status',
      dataIndex: ['loanInfo', 'status'],
      key: 'status',
      render: (status) => <Tag color={statusColor(status)}>{status}</Tag>,
    };

    const dueDateColumn = {
      title: 'Due Date',
      dataIndex: ['loanInfo', 'maturityDate'],
      key: 'dueDate',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '—'),
    };

    const typeSpecificColumns = [];
    if (title.startsWith('Loans with Type:')) {
      typeSpecificColumns.push(
        {
          title: 'Loan Type',
          dataIndex: ['loanInfo', 'type'],
          key: 'type',
        },
        {
          title: 'Start Payment Date',
          dataIndex: ['loanInfo', 'startPaymentDate'],
          key: 'startPaymentDate',
          render: (date) => (date ? new Date(date).toLocaleDateString() : '—'),
        }
      );
    } else if (title.startsWith('Loans for Collector:')) {
      return [
        ...coreColumns,
        {
          title: 'Collector',
          dataIndex: ['loanInfo', 'collectorName'],
          key: 'collectorName',
        },
        {
          title: 'Loan Type',
          dataIndex: ['loanInfo', 'type'],
          key: 'type',
        },
        {
          title: 'Start Payment Date',
          dataIndex: ['loanInfo', 'startPaymentDate'],
          key: 'startPaymentDate',
          render: (date) => (date ? new Date(date).toLocaleDateString() : '—'),
        },
        dueDateColumn,
        statusColumn,
      ];
    }

    return [...coreColumns, ...typeSpecificColumns, dueDateColumn, statusColumn];
  };

  const fetchLoans = useCallback(async (page, limit) => {
    if (!filter) return;
    setLoading(true);
    try {
      const response = await api.get('/loans', {
        params: { ...filter, page, limit, sortBy: 'StartPaymentDate', sortDir: 'desc' },
      });
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
