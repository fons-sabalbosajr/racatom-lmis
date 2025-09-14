import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Popconfirm,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Pagination,
} from "antd";
import api from "../../../utils/axios";
import "./collectoraccounts.css";

const { Option } = Select;
const { Search } = Input;

const CollectorAccounts = () => {
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollector, setEditingCollector] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [areaRouteFilter, setAreaRouteFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Fetch collectors with optional search
  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/collectors", {
        params: { search: searchText },
      });
      const sortedCollectors = data.data.sort((a, b) =>
        a.Name.localeCompare(b.Name)
      );
      setCollectors(sortedCollectors);
    } catch (err) {
      console.error(err);
      message.error("Failed to load collectors");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCollectors();
  }, [searchText]);

  const filteredCollectors = collectors.filter((c) => {
    const searchMatch =
      c.Name.toLowerCase().includes(searchText.toLowerCase()) ||
      c.GeneratedIDNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      c.ContactNumber.toLowerCase().includes(searchText.toLowerCase());

    const routeMatch = areaRouteFilter
      ? c.AreaRoutes.includes(areaRouteFilter)
      : true;

    return searchMatch && routeMatch;
  });

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openModal = (collector = null) => {
    setEditingCollector(collector);
    if (collector) {
      form.setFieldsValue({
        Name: collector.Name,
        ContactNumber: collector.ContactNumber,
        Email: collector.Email,
        AreaRoutes: collector.AreaRoutes,
        EmploymentStatus: collector.EmploymentStatus,
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // Convert AreaRoutes to array if input as comma-separated string
      if (typeof values.AreaRoutes === "string") {
        values.AreaRoutes = values.AreaRoutes.split(",").map((r) => r.trim());
      }

      if (editingCollector) {
        await api.put(`/collectors/${editingCollector._id}`, values);
        message.success("Collector updated");
      } else {
        await api.post("/collectors", values);
        message.success("Collector added");
      }
      setIsModalOpen(false);
      setEditingCollector(null);
      fetchCollectors();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Failed to save collector");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/collectors/${id}`);
      message.success("Collector deleted");
      fetchCollectors();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete collector");
    }
  };

  const columns = [
    {
      title: "Collector's Information",
      key: "info",
      width: "60%",
      render: (_, record) => {
        const stringToDarkColor = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
          }
          const h = hash % 360;
          return `hsl(${h}, 60%, 40%)`; // Darker color
        };

        // Sort AreaRoutes alphabetically
        const sortedRoutes = [...(record.AreaRoutes || [])].sort((a, b) =>
          a.localeCompare(b)
        );

        return (
          <div className="collector-info">
            <div className="collector-name">{record.Name}</div>
            <div>
              <strong>Contact:</strong> {record.ContactNumber}
              {record.Email && record.Email !== "-" && (
                <div style={{ fontSize: "12px", color: "#555" }}>
                  <strong>Email:</strong> {record.Email}
                </div>
              )}
            </div>
            <div className="collector-routes">
              {sortedRoutes.map((r) => {
                const isActive = r === areaRouteFilter;
                return (
                  <Tag
                    className="area-route-tag"
                    color={isActive ? "red" : stringToDarkColor(r)}
                    key={r}
                    style={{ fontWeight: "500" }}
                  >
                    {r}
                  </Tag>
                );
              })}
            </div>
            <div className="collector-id">ID: {record.GeneratedIDNumber}</div>
          </div>
        );
      },
    },
    {
      title: "Employment Status",
      dataIndex: "EmploymentStatus",
      key: "status",
      filters: [
        { text: "Active", value: "Active" },
        { text: "Inactive", value: "Inactive" },
        { text: "Suspended", value: "Suspended" },
      ],
      onFilter: (value, record) => record.EmploymentStatus === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          <Button
            size="small"
            style={{ marginRight: "8px" }}
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div className="collector-container">
      <h2>Collector Accounts</h2>

      <div className="collector-actions">
        <Input.Search
          placeholder="Search by Name, ID, Contact"
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 300 }}
        />
        <Select
          placeholder="Filter by Area Route"
          style={{ width: 200 }}
          allowClear
          onChange={(value) => setAreaRouteFilter(value)}
        >
          {Array.from(new Set(collectors.flatMap((c) => c.AreaRoutes)))
            .sort((a, b) => a.localeCompare(b))
            .map((route) => (
              <Select.Option key={route} value={route}>
                {route}
              </Select.Option>
            ))}
        </Select>

        {/* Show number of results only when filter is active */}
        {areaRouteFilter && filteredCollectors.length > 0 && (
          <span style={{ fontWeight: 400, fontStyle: "italic", color: "#555" }}>
            {filteredCollectors.length} colllector account result
            {filteredCollectors.length > 1 ? "s" : ""} found
          </span>
        )}

        <Button
          type="primary"
          size="small"
          onClick={() => openModal()}
          style={{ marginLeft: "auto" }}
        >
          Add Collector
        </Button>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={filteredCollectors.length}
          onChange={handlePageChange}
          size="small"
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredCollectors.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
        rowKey="_id"
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingCollector ? "Edit Collector" : "Add Collector"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="Name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ContactNumber" label="Contact">
            <Input />
          </Form.Item>
          <Form.Item name="Email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="AreaRoutes" label="Area Routes">
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="Add routes"
            >
              {Array.from(new Set(collectors.flatMap((c) => c.AreaRoutes)))
                .sort((a, b) => a.localeCompare(b))
                .map((route) => (
                  <Option key={route}>{route}</Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="EmploymentStatus" label="Employment Status">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Suspended">Suspended</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CollectorAccounts;