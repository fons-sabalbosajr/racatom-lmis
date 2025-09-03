import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, InputNumber, Select, message, Popconfirm } from "antd";
import axios from "axios";

const { Option } = Select;

// Fields definition
const fields = [
  { name: "Type", label: "Type", type: "select", options: ["REGULAR", "SPECIAL"] },
  { name: "Principal", label: "Principal", type: "number" },
  { name: "Term", label: "Term (months)", type: "number" },
  { name: "Mode", label: "Mode", type: "select", options: ["DAILY", "WEEKLY", "MONTHLY"] },
  { name: "Processing Fee", label: "Processing Fee", type: "number" },
  { name: "Interest Rate/Month", label: "Interest Rate/Month", type: "number" },
  { name: "Notarial Rate", label: "Notarial Rate", type: "number" },
  { name: "Annotation Rate", label: "Annotation Rate", type: "number" },
  { name: "Insurance Rate", label: "Insurance Rate", type: "number" },
  { name: "Vat Rate", label: "Vat Rate", type: "number" },
  { name: "Penalty Rate", label: "Penalty Rate", type: "number" },
  { name: "Doc Rate", label: "Doc Rate", type: "number" },
  { name: "Misc. Rate", label: "Misc. Rate", type: "number" },
];

const LoanRateConfig = () => {
  const [loanRates, setLoanRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form] = Form.useForm();

  const API_BASE = import.meta.env.VITE_API_URL + "/loan_rates";

  // Fetch loan rates
  const fetchLoanRates = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE);
      setLoanRates(res.data);
    } catch (err) {
      console.error("Fetch loan rates error:", err.response || err.message);
      message.error("Failed to fetch loan rates");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoanRates();
  }, []);

  // Open modal
  const openModal = (rate = null) => {
    setEditingRate(rate);
    form.resetFields();
    if (rate) form.setFieldsValue(rate);
    setModalVisible(true);
  };

  // Save new or updated rate
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingRate) {
        await axios.put(`${API_BASE}/${editingRate._id}`, values);
        message.success("Updated successfully");
      } else {
        await axios.post(API_BASE, values);
        message.success("Added successfully");
      }
      setModalVisible(false);
      fetchLoanRates();
    } catch (err) {
      console.error(err);
      message.error("Failed to save loan rate");
    }
  };

  // Delete rate
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);
      message.success("Deleted successfully");
      fetchLoanRates();
    } catch (err) {
      console.error(err);
      message.error("Delete failed");
    }
  };

  // Table columns
  const columns = [
    ...fields.map((f) => ({
      title: f.label,
      key: f.name,
      render: (_, record) => {
        const val = record[f.name];
        return f.type === "number" ? (val != null ? val.toLocaleString() : 0) : val || "-";
      },
      width: 150, // fixed width for horizontal scroll
    })),
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 120,
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => openModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this loan rate?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  // Group data by Type
  const groupedData = loanRates.reduce((acc, rate) => {
    if (!acc[rate.Type]) acc[rate.Type] = [];
    acc[rate.Type].push(rate);
    return acc;
  }, {});

  // Flatten grouped data with a group row for display
  const dataSource = [];
  Object.keys(groupedData).forEach((type) => {
    dataSource.push({ _id: `group-${type}`, Type: type, isGroup: true });
    groupedData[type].forEach((r) => dataSource.push(r));
  });

  return (
    <div style={{ padding: 20 }}>
      <Button type="primary" onClick={() => openModal()} style={{ marginBottom: 20 }}>
        Add Loan Rate
      </Button>

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="_id"
        loading={loading}
        bordered
        scroll={{ x: "max-content" }}
        pagination={false}
        rowClassName={(record) => (record.isGroup ? "group-row" : "")}
        expandable={{
          rowExpandable: (record) => record.isGroup,
          expandedRowRender: (record) => null, // group row doesn't have children
        }}
        locale={{ emptyText: "No loan rates found" }}
      />

      <Modal
        title={editingRate ? "Edit Loan Rate" : "Add Loan Rate"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Save"
        width={700}
      >
        <Form form={form} layout="vertical">
          {fields.map((f) => (
            <Form.Item
              key={f.name}
              name={f.name}
              label={f.label}
              rules={[{ required: true, message: `Please input ${f.label}` }]}
            >
              {f.type === "number" ? (
                <InputNumber style={{ width: "100%" }} />
              ) : (
                <Select placeholder={`Select ${f.label}`}>
                  {f.options.map((opt) => (
                    <Option key={opt} value={opt}>
                      {opt}
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <style>{`
        .group-row {
          background: #fafafa;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default LoanRateConfig;
