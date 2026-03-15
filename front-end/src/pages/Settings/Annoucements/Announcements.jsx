import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Popconfirm,
  Drawer,
  Form,
  Input,
  Switch,
  DatePicker,
  Tag,
  Select,
  Card,
  Statistic,
  Space,
  Typography,
  Tooltip,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../utils/axios";
import { swalMessage } from "../../../utils/swal";
import "./announcements.css";

const { TextArea } = Input;
const { Text } = Typography;
const { RangePicker } = DatePicker;

const PRIORITY_CONFIG = {
  low: { color: "default", label: "Low" },
  normal: { color: "blue", label: "Normal" },
  high: { color: "orange", label: "High" },
  urgent: { color: "red", label: "Urgent" },
};

/** Derive computed status from the announcement data */
const deriveStatus = (record) => {
  const now = dayjs();
  if (record.ExpirationDate && dayjs(record.ExpirationDate).isBefore(now))
    return "expired";
  if (!record.isActive) return "inactive";
  if (record.ValidFrom && dayjs(record.ValidFrom).isAfter(now))
    return "scheduled";
  return "active";
};

const STATUS_TAG = {
  active: { color: "success", icon: <CheckCircleOutlined />, label: "Active" },
  inactive: { color: "default", icon: <CloseCircleOutlined />, label: "Inactive" },
  expired: { color: "error", icon: <ExclamationCircleOutlined />, label: "Expired" },
  scheduled: { color: "processing", icon: <ClockCircleOutlined />, label: "Scheduled" },
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const [announcementsRes, statsRes] = await Promise.all([
        api.get("/announcements/all"),
        api.get("/announcements/stats"),
      ]);
      setAnnouncements(announcementsRes.data.announcements || []);
      setStats(statsRes.data.stats || {});
    } catch {
      swalMessage.error("Failed to load announcements");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Filtered data ──────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = announcements.map((a) => ({ ...a, _status: deriveStatus(a) }));

    if (statusFilter !== "all") {
      data = data.filter((a) => a._status === statusFilter);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter(
        (a) =>
          (a.Title || "").toLowerCase().includes(q) ||
          (a.Content || "").toLowerCase().includes(q) ||
          (a.PostedBy || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [announcements, statusFilter, searchText]);

  // ── Drawer open / close ────────────────────────────────────────
  const openDrawer = (record = null) => {
    setEditing(record);
    if (record) {
      form.setFieldsValue({
        Title: record.Title,
        Content: record.Content,
        isActive: record.isActive ?? true,
        showOnLogin: record.showOnLogin ?? false,
        Priority: record.Priority || "normal",
        ValidFrom: record.ValidFrom ? dayjs(record.ValidFrom) : null,
        ExpirationDate: record.ExpirationDate
          ? dayjs(record.ExpirationDate)
          : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, Priority: "normal", showOnLogin: false });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  // ── Save (create / update) ─────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        ValidFrom: values.ValidFrom ? values.ValidFrom.toISOString() : null,
        ExpirationDate: values.ExpirationDate
          ? values.ExpirationDate.toISOString()
          : null,
      };

      if (editing) {
        await api.put(`/announcements/${editing._id}`, payload);
        swalMessage.success("Announcement updated");
      } else {
        await api.post("/announcements", payload);
        swalMessage.success("Announcement created");
      }

      closeDrawer();
      fetchAnnouncements();
    } catch {
      swalMessage.error("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle field ───────────────────────────────────────────────
  const handleToggle = async (record, field) => {
    try {
      await api.patch(`/announcements/${record._id}/toggle`, { field });
      const label = field === "isActive" ? "status" : "login visibility";
      swalMessage.success(
        `${record.Title} — ${label} updated`
      );
      fetchAnnouncements();
    } catch {
      swalMessage.error("Failed to update");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      swalMessage.success("Announcement deleted");
      fetchAnnouncements();
    } catch {
      swalMessage.error("Failed to delete");
    }
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns = [
    {
      title: "Announcement",
      key: "info",
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div className="announcement-title-cell">{record.Title}</div>
          <div className="announcement-content-cell">{record.Content}</div>
          <div className="announcement-meta-cell">
            Posted {dayjs(record.PostedDate).format("MMM DD, YYYY h:mm A")}
            {record.PostedBy ? ` by ${record.PostedBy}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      align: "center",
      render: (_, record) => {
        const s = record._status;
        const cfg = STATUS_TAG[s] || STATUS_TAG.inactive;
        return (
          <Tag icon={cfg.icon} color={cfg.color}>
            {cfg.label}
          </Tag>
        );
      },
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
        { text: "Scheduled", value: "scheduled" },
        { text: "Expired", value: "expired" },
      ],
      onFilter: (value, record) => record._status === value,
    },
    {
      title: "Priority",
      dataIndex: "Priority",
      key: "priority",
      width: 90,
      align: "center",
      render: (val) => {
        const cfg = PRIORITY_CONFIG[val] || PRIORITY_CONFIG.normal;
        return (
          <Tag
            color={cfg.color}
            className={val === "urgent" ? "priority-urgent" : ""}
          >
            {cfg.label}
          </Tag>
        );
      },
      filters: Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({
        text: v.label,
        value: k,
      })),
      onFilter: (value, record) => (record.Priority || "normal") === value,
    },
    {
      title: "Active",
      key: "isActive",
      width: 70,
      align: "center",
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isActive}
          onChange={() => handleToggle(record, "isActive")}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Show on Login Page">
          <GlobalOutlined /> Login
        </Tooltip>
      ),
      key: "showOnLogin",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.showOnLogin}
          onChange={() => handleToggle(record, "showOnLogin")}
        />
      ),
    },
    {
      title: "Validity",
      key: "validity",
      width: 180,
      render: (_, record) => {
        const from = record.ValidFrom
          ? dayjs(record.ValidFrom).format("MMM DD, YYYY")
          : "—";
        const to = record.ExpirationDate
          ? dayjs(record.ExpirationDate).format("MMM DD, YYYY")
          : "No expiry";
        return (
          <Text style={{ fontSize: 12 }}>
            {from} → {to}
          </Text>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this announcement?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="announcement-manager">
      {/* Header */}
      <div className="page-header">
        <h2>
          <NotificationOutlined style={{ marginRight: 8 }} />
          Announcement Manager
        </h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAnnouncements}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openDrawer()}
          >
            New Announcement
          </Button>
        </Space>
      </div>

      {/* Stats */}
      <div className="announcement-stats">
        <Card size="small" className="stat-card" variant="bordered">
          <Statistic title="Total" value={stats.total ?? 0} />
        </Card>
        <Card size="small" className="stat-card" variant="bordered">
          <Statistic
            title="Active"
            value={stats.active ?? 0}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
        <Card size="small" className="stat-card" variant="bordered">
          <Statistic
            title="Inactive"
            value={stats.inactive ?? 0}
            valueStyle={{ color: "#999" }}
          />
        </Card>
        <Card size="small" className="stat-card" variant="bordered">
          <Statistic
            title="Scheduled"
            value={stats.scheduled ?? 0}
            valueStyle={{ color: "#1677ff" }}
          />
        </Card>
        <Card size="small" className="stat-card" variant="bordered">
          <Statistic
            title="Expired"
            value={stats.expired ?? 0}
            valueStyle={{ color: "#ff4d4f" }}
          />
        </Card>
        <Card size="small" className="stat-card" variant="bordered">
          <Statistic
            title="On Login Page"
            value={stats.loginPage ?? 0}
            prefix={<GlobalOutlined />}
            valueStyle={{ color: "#722ed1" }}
          />
        </Card>
      </div>

      {/* Toolbar */}
      <div className="announcement-toolbar">
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 140 }}
          options={[
            { label: "All Status", value: "all" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Expired", value: "expired" },
          ]}
        />
        <Input.Search
          placeholder="Search announcements..."
          allowClear
          onSearch={setSearchText}
          onChange={(e) => !e.target.value && setSearchText("")}
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: [8, 15, 30] }}
        size="middle"
        rowClassName={(record) => {
          if (record._status === "expired") return "row-expired";
          if (record._status === "inactive") return "row-inactive";
          return "";
        }}
        locale={{ emptyText: <Empty description="No announcements found" /> }}
      />

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? "Edit Announcement" : "New Announcement"}
        width={480}
        open={drawerOpen}
        onClose={closeDrawer}
        forceRender
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>
              {editing ? "Update" : "Publish"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" className="announcement-form">
          <Form.Item
            name="Title"
            label="Title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="Announcement title" maxLength={150} showCount />
          </Form.Item>

          <Form.Item
            name="Content"
            label="Content"
            rules={[{ required: true, message: "Content is required" }]}
          >
            <TextArea
              placeholder="Write the announcement content..."
              autoSize={{ minRows: 4, maxRows: 10 }}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <div className="form-row">
            <Form.Item name="Priority" label="Priority">
              <Select
                options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({
                  label: v.label,
                  value: k,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </div>

          <Form.Item
            name="showOnLogin"
            label="Display on Login Page"
            valuePropName="checked"
            tooltip="When enabled, this announcement will appear on the public login page for all visitors"
          >
            <Switch
              checkedChildren={<><GlobalOutlined /> Visible</>}
              unCheckedChildren="Hidden"
            />
          </Form.Item>

          <div className="form-row">
            <Form.Item
              name="ValidFrom"
              label="Valid From"
              tooltip="Leave empty to make it effective immediately"
            >
              <DatePicker
                style={{ width: "100%" }}
                showTime={{ format: "HH:mm" }}
                format="MMM DD, YYYY HH:mm"
                placeholder="Effective immediately"
              />
            </Form.Item>

            <Form.Item
              name="ExpirationDate"
              label="Expires On"
              tooltip="Leave empty for no expiration"
            >
              <DatePicker
                style={{ width: "100%" }}
                showTime={{ format: "HH:mm" }}
                format="MMM DD, YYYY HH:mm"
                placeholder="No expiration"
              />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default Announcements;
