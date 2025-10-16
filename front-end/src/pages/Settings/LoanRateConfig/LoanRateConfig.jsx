import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Input,
  Row,
  Col,
  Card,
} from "antd";
import api, { API_BASE_URL } from "../../../utils/axios";
import "./loanrateconfig.css";

const { Option } = Select;
const { Search } = Input;

// Fields definition
const fields = [
  {
    name: "Type",
    label: "Type",
    type: "select",
    options: ["REGULAR", "SPECIAL"],
  },
  { name: "Principal", label: "Principal", type: "number" },
  { name: "Term", label: "Term (months)", type: "number" },
  {
    name: "Mode",
    label: "Mode",
    type: "select",
    options: ["DAILY", "WEEKLY", "MONTHLY"],
  },
  { name: "Processing Fee", label: "Processing Fee", type: "number" },
  { name: "Interest Rate/Month", label: "Interest Rate/Month", type: "number" },
  { name: "Penalty Rate", label: "Penalty Rate", type: "number" },
  { name: "Notarial Rate", label: "Notarial Rate", type: "number" },
  { name: "Annotation Rate", label: "Annotation Rate", type: "number" },
  { name: "Insurance Rate", label: "Insurance Rate", type: "number" },
  { name: "Vat Rate", label: "Vat Rate", type: "number" },
  { name: "Doc Rate", label: "Doc Rate", type: "number" },
  { name: "Misc. Rate", label: "Misc. Rate", type: "number" },
];

const LoanRateConfig = ({ isModal = false, onSelect }) => {
  const [loanRates, setLoanRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState({
    type: null,
    mode: null,
    search: "",
  });

  const API_BASE = `${API_BASE_URL}/loan_rates`;

  useEffect(() => {
    fetchLoanRates();
  }, []);

  const fetchLoanRates = async () => {
    setLoading(true);
    try {
  const res = await api.get(API_BASE.replace(API_BASE_URL, ""));
      setLoanRates(res.data.data || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch loan rates");
    }
    setLoading(false);
  };

  const openModal = (rate = null) => {
    setEditingRate(rate);
    form.resetFields();
    if (rate) form.setFieldsValue(rate);
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingRate)
        await api.put(`${API_BASE.replace(API_BASE_URL, "")}/${editingRate._id}`, values);
      else await api.post(API_BASE.replace(API_BASE_URL, ""), values);
      message.success(
        editingRate ? "Updated successfully" : "Added successfully"
      );
      setModalVisible(false);
      fetchLoanRates();
    } catch (err) {
      console.error(err);
      message.error("Failed to save loan rate");
    }
  };

  const handleDelete = async (id) => {
    try {
  await api.delete(`${API_BASE.replace(API_BASE_URL, "")}/${id}`);
      message.success("Deleted successfully");
      fetchLoanRates();
    } catch (err) {
      console.error(err);
      message.error("Delete failed");
    }
  };

  const filteredData = loanRates.filter((rate) => {
    const matchesType = filters.type ? rate.Type === filters.type : true;
    const matchesMode = filters.mode ? rate.Mode === filters.mode : true;
    const matchesSearch =
      !filters.search ||
      Object.values(rate).some((val) =>
        String(val).toLowerCase().includes(filters.search.toLowerCase())
      );
    return matchesType && matchesMode && matchesSearch;
  });

  const currencyFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });

  const isBrowser = typeof window !== "undefined";
  const vw = isBrowser ? window.innerWidth : 1440;
  const isTablet = vw <= 1080;

  const columns = [
    {
      title: "Type",
      dataIndex: "Type",
      key: "Type",
      width: 120,
      filters: fields
        .find((f) => f.name === "Type")
        .options.map((opt) => ({ text: opt, value: opt })),
      onFilter: (value, record) => record.Type === value,
    },
    {
      title: "Mode",
      dataIndex: "Mode",
      key: "Mode",
      width: 120,
      filters: fields
        .find((f) => f.name === "Mode")
        .options.map((opt) => ({ text: opt, value: opt })),
      onFilter: (value, record) => record.Mode === value,
    },
    {
      title: "Term (months)",
      dataIndex: "Term",
      key: "Term",
      sorter: (a, b) => a.Term - b.Term,
      width: 120,
    },
    ...fields
      .filter((f) => !["Type", "Mode", "Term"].includes(f.name))
      .map((f) => ({
        title: f.label,
        dataIndex: f.name,
        key: f.name,
        render: (val) => {
          if (f.type === "number") {
            if (val == null) return "-";
            if (["Interest Rate/Month", "Penalty Rate"].includes(f.label))
              return `${val}%`;
            return currencyFormatter.format(val);
          }
          return val || "-";
        },
        width: 100,
      })),
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: isTablet ? 90 : 180,
      render: (_, record) => {
        if (isTablet) {
          // Tablet: keep a single concise action for selection
          return (
            <>
              {isModal && typeof onSelect === "function" ? (
                <Button size="small" type="primary" onClick={() => onSelect(record)}>
                  Use
                </Button>
              ) : (
                <Button size="small" onClick={() => openModal(record)}>
                  Edit
                </Button>
              )}
            </>
          );
        }
        // Desktop: show full actions
        return (
          <>
            <Button
              size="small"
              type="primary"
              onClick={() => openModal(record)}
              style={{ marginRight: 8 }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Are you sure?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button size="small" danger>
                Delete
              </Button>
            </Popconfirm>
            {isModal && typeof onSelect === "function" && (
              <Button
                size="small"
                style={{ marginLeft: 8 }}
                onClick={() => onSelect(record)}
              >
                Use This Rate
              </Button>
            )}
          </>
        );
      },
    },
  ];

  return (
    <Card
      title="Loan Rates Configuration"
      className={isModal ? "loan-rate-config-modal" : ""}
      style={{ width: "100%", minHeight: isModal ? "auto" : "80vh" }}
    >
      {/* Filter Bar */}
      <Row gutter={12} align="middle" style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <Search
            placeholder="Search..."
            allowClear
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value || "" }))
            }
            onSearch={(value) =>
              setFilters((f) => ({ ...f, search: value || "" }))
            }
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            allowClear
            placeholder="Filter by Type"
            value={filters.type}
            style={{ width: "100%" }}
            onChange={(val) => setFilters((f) => ({ ...f, type: val || null }))}
          >
            {fields
              .find((f) => f.name === "Type")
              .options.map((opt) => (
                <Option key={opt} value={opt}>
                  {opt}
                </Option>
              ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            allowClear
            placeholder="Filter by Mode"
            value={filters.mode}
            style={{ width: "100%" }}
            onChange={(val) => setFilters((f) => ({ ...f, mode: val || null }))}
          >
            {fields
              .find((f) => f.name === "Mode")
              .options.map((opt) => (
                <Option key={opt} value={opt}>
                  {opt}
                </Option>
              ))}
          </Select>
        </Col>
        <Col
          xs={24}
          sm={4}
          md={{ span: 4, offset: 6 }}
          style={{ textAlign: "right" }}
        >
          <Button type="primary" onClick={() => openModal()}>
            Add Loan Rate
          </Button>
        </Col>
      </Row>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="_id"
        loading={loading}
        bordered
        size="small"
        scroll={{ x: "max-content", y: 550 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          onChange: (page, pageSize) =>
            setPagination({ current: page, pageSize }),
          onShowSizeChange: (current, size) =>
            setPagination({ current: 1, pageSize: size }),
        }}
        locale={{ emptyText: "No loan rates found" }}
      />

      {/* Modal */}
      <Modal
        title={editingRate ? "Edit Loan Rate" : "Add Loan Rate"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Save"
        width={800}
      >
        <Form form={form} layout="vertical">
          <div className="loanrateconfig-form-grid">
            {fields.map((f) => (
              <Form.Item
                key={f.name}
                name={f.name}
                label={f.label}
                rules={[{ required: true, message: `Please input ${f.label}` }]}
              >
                {f.type === "number" ? (
                  ["Interest Rate/Month", "Penalty Rate"].includes(f.label) ? (
                    <InputNumber style={{ width: "100%" }} addonAfter="%" />
                  ) : (
                    <InputNumber style={{ width: "100%" }} addonBefore="₱" />
                  )
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
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default LoanRateConfig;