import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Popconfirm,
  Modal,
  Form,
  Input,
  Select,
  message,
  Pagination,
  Upload,
  Tabs,
  Tag,
  Row,
  Col,
  Progress,
  DatePicker,
} from "antd";
import { UploadOutlined, LinkOutlined, DeleteOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import "./collectoraccounts.css";

const { Option } = Select;
const { Search } = Input;

import dayjs from "dayjs";

const CollectorAccounts = () => {
  const [collectors, setCollectors] = useState([]);
  const [isTablet, setIsTablet] = useState(typeof window !== "undefined" ? window.innerWidth <= 1080 : false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollector, setEditingCollector] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [areaRouteFilter, setAreaRouteFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Documents modal state
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [activeCollector, setActiveCollector] = useState(null);
  const [collectorDocs, setCollectorDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadForm] = Form.useForm();
  const [docCategoryFilter, setDocCategoryFilter] = useState("all");
  const [docsActiveTab, setDocsActiveTab] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const fetchCollectorDocs = async (collector) => {
    if (!collector?._id) return;
    setDocsLoading(true);
    try {
      const res = await api.get(`/collectors/${collector._id}/documents`);
      if (res.data.success) setCollectorDocs(res.data.data || []);
      else message.error(res.data.message || "Failed to load documents");
    } catch (e) {
      console.error(e);
      message.error("Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  };

  const openDocsModal = (collector) => {
    setActiveCollector(collector);
    setDocsModalOpen(true);
    fetchCollectorDocs(collector);
    uploadForm.resetFields();
    setDocCategoryFilter("all");
    setDocsActiveTab("files");
  };

  const handleUpload = async (vals) => {
    if (!activeCollector?._id) return;
    const fileList = Array.isArray(vals.file) ? vals.file : vals.file ? [vals.file] : [];
    const originFiles = fileList
      .map((fi) => fi?.originFileObj || fi?.file || fi?.file?.originFileObj)
      .filter(Boolean);
    if (!originFiles.length) {
      return message.warning("Select file(s)");
    }
    try {
      setUploading(true);
      setUploadPercent(0);
      const formData = new FormData();
      originFiles.forEach((of) => formData.append("file", of));
      if (vals.name) formData.append("name", vals.name);
      if (vals.type) formData.append("type", vals.type);
      if (vals.category) formData.append("category", vals.category);
      const res = await api.post(`/collectors/${activeCollector._id}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) => {
          if (pe && pe.total) {
            const percent = Math.round((pe.loaded * 100) / pe.total);
            setUploadPercent(percent);
          }
        },
      });
      if (res.data.success) {
        message.success("Uploaded");
        fetchCollectorDocs(activeCollector);
        uploadForm.resetFields();
        setDocsActiveTab("files");
      } else message.error(res.data.message || "Upload failed");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Upload error";
      message.error(msg);
    }
    finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  const handleAddLink = async (vals) => {
    if (!activeCollector?._id) return;
    try {
      const res = await api.post(`/collectors/${activeCollector._id}/documents/link`, vals);
      if (res.data.success) {
        message.success("Link saved");
        fetchCollectorDocs(activeCollector);
        setDocsActiveTab("files");
      } else message.error(res.data.message || "Failed to save link");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Save link error";
      message.error(msg);
    }
  };

  const handleDeleteDoc = async (doc) => {
    try {
      setDeletingDocId(doc._id);
      const res = await api.delete(`/collectors/documents/${doc._id}`);
      if (res.data.success) {
        message.success("Deleted");
        fetchCollectorDocs(activeCollector);
      } else message.error(res.data.message || "Delete failed");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Delete error";
      message.error(msg);
    } finally {
      setDeletingDocId(null);
    }
  };

  // Fetch collectors with optional search
  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/collectors", {
        params: { search: searchText },
      });
      // Sort by GeneratedIDNumber ascending using numeric-aware comparator
      const parseId = (id) => {
        if (!id) return { prefix: "", num: null, raw: "" };
        const s = String(id).trim();
        const m = s.match(/^(.+?)(\d+)$/);
        if (m) return { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length, raw: s };
        return { prefix: s, num: null, raw: s };
      };

      const compareGeneratedID = (a, b) => {
        const pa = parseId(a?.GeneratedIDNumber);
        const pb = parseId(b?.GeneratedIDNumber);
        // If both have numeric suffix and same prefix, compare numerically
        if (pa.num !== null && pb.num !== null && pa.prefix === pb.prefix) {
          return pa.num - pb.num;
        }
        // Otherwise fallback to lexicographic on raw string
        return (pa.raw || "").localeCompare(pb.raw || "");
      };

      const sortedCollectors = (data.data || []).slice().sort(compareGeneratedID);
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

  // Responsive detection for tablet screens (<= 1080px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1080px)");
    const handle = (e) => setIsTablet(e.matches);
    // set initial
    setIsTablet(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handle);
    else mq.addListener(handle);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handle);
      else mq.removeListener(handle);
    };
  }, []);

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
        GeneratedIDNumber: collector.GeneratedIDNumber,
        EmploymentDate: collector.EmploymentDate ? dayjs(collector.EmploymentDate) : undefined,
      });
    } else {
      form.resetFields();
      // When creating a new collector, prefill the next GeneratedIDNumber based on existing collectors
      try {
        const nextId = getNextGeneratedID();
        if (nextId) form.setFieldsValue({ GeneratedIDNumber: nextId });
      } catch (e) {
        // ignore and leave blank if computation fails
      }
    }
    setIsModalOpen(true);
  };

  // Compute next GeneratedIDNumber by scanning existing collectors.
  // Strategy:
  // - Parse existing GeneratedIDNumber values for a trailing numeric suffix (e.g. "C-000123").
  // - Pick the most common prefix (text before the number), take the highest numeric value and increment it, preserving width (leading zeros).
  // - If no numeric IDs found, fallback to a timestamp-based id `C-<last6>`.
  const getNextGeneratedID = () => {
    if (!collectors || collectors.length === 0) return `C-${String(Date.now()).slice(-6)}`;

    const parsed = collectors
      .map((c) => (c && c.GeneratedIDNumber ? String(c.GeneratedIDNumber).trim() : ""))
      .filter(Boolean)
      .map((id) => {
        const m = id.match(/^(.+?)(\d+)$/);
        if (m) return { id, prefix: m[1], num: parseInt(m[2], 10), width: m[2].length };
        return null;
      })
      .filter(Boolean);

    if (parsed.length === 0) {
      return `C-${String(Date.now()).slice(-6)}`;
    }

    // Choose the most common prefix among parsed ids
    const counts = parsed.reduce((acc, p) => {
      acc[p.prefix] = (acc[p.prefix] || 0) + 1;
      return acc;
    }, {});
    const prefixes = Object.keys(counts);
    const commonPrefix = prefixes.reduce((a, b) => (counts[a] >= counts[b] ? a : b));

    const withPrefix = parsed.filter((p) => p.prefix === commonPrefix);
    const maxNum = Math.max(...withPrefix.map((p) => p.num));
    const maxWidth = Math.max(...withPrefix.map((p) => p.width));
    const nextNum = String(maxNum + 1).padStart(maxWidth, "0");

    return `${commonPrefix}${nextNum}`;
  };

  // Generate a candidate ID from a base id, offset by attempt number.
  // If base has a trailing number, increment it; otherwise append an attempt suffix.
  const generateCandidateID = (base, attempt = 1) => {
    const b = String(base || "C-").trim();
    const m = b.match(/^(.+?)(\d+)$/);
    if (m) {
      const prefix = m[1];
      const num = parseInt(m[2], 10) || 0;
      const width = m[2].length;
      const next = String(num + attempt).padStart(width, "0");
      return `${prefix}${next}`;
    }
    // no trailing number: add a dash and attempt
    return `${b}-${attempt}`;
  };

  // Detect whether an error from the server corresponds to a duplicate/unique constraint on GeneratedIDNumber
  const isDuplicateError = (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg = (data?.message || err?.message || "").toString().toLowerCase();
    if (status === 409) return true;
    if (data && (data.code === 11000 || data.code === "11000")) return true;
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("generatedidnumber")) return true;
    return false;
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // Convert AreaRoutes to array if input as comma-separated string
      if (typeof values.AreaRoutes === "string") {
        values.AreaRoutes = values.AreaRoutes.split(",").map((r) => r.trim());
      }
      // Normalize EmploymentDate to ISO (model requires EmploymentDate)
      if (values.EmploymentDate && values.EmploymentDate.toISOString) {
        values.EmploymentDate = values.EmploymentDate.toISOString();
      } else if (!values.EmploymentDate) {
        // default to today if not provided to satisfy model requirement
        values.EmploymentDate = new Date().toISOString();
      }
      // Ensure GeneratedIDNumber exists (model requires unique GeneratedIDNumber)
      if (!values.GeneratedIDNumber || String(values.GeneratedIDNumber).trim() === "") {
        // create a simple unique id: C- + last 6 of timestamp
        values.GeneratedIDNumber = `C-${String(Date.now()).slice(-6)}`;
      }

      if (editingCollector) {
        await api.put(`/collectors/${editingCollector._id}`, values);
        message.success("Collector updated");
      } else {
        // Try creating with retry on duplicate GeneratedIDNumber (up to 5 attempts)
        const maxAttempts = 5;
        let attempt = 0;
        let lastErr = null;
        let baseId = values.GeneratedIDNumber || getNextGeneratedID();
        while (attempt < maxAttempts) {
          attempt += 1;
          const candidate = generateCandidateID(baseId, attempt === 1 ? 0 : attempt);
          const payload = { ...values, GeneratedIDNumber: candidate };
          try {
            await api.post("/collectors", payload);
            message.success("Collector added");
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            if (isDuplicateError(e)) {
              // try again with next candidate
              continue;
            }
            // non-duplicate error: stop retrying
            break;
          }
        }

        if (lastErr) {
          // If lastErr exists, it means all attempts failed or a non-duplicate error occurred
          throw lastErr;
        }
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
      width: isTablet ? "40%" : "40%",
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
      width: isTablet ? "30%" : "25%",
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
      width: isTablet ? "20%" : "15%",
      render: (_, record) => (
        <>
          {isTablet ? (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                style={{ marginRight: 8 }}
                onClick={() => openModal(record)}
              />
              <Button
                size="small"
                icon={<FileTextOutlined />}
                style={{ marginRight: 8 }}
                onClick={() => openDocsModal(record)}
              />
              <Popconfirm title="Are you sure?" onConfirm={() => handleDelete(record._id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          ) : (
            <>
              <Button
                size="small"
                style={{ marginRight: "8px" }}
                onClick={() => openModal(record)}
              >
                Edit
              </Button>
              <Button
                size="small"
                style={{ marginRight: 8 }}
                onClick={() => openDocsModal(record)}
              >
                Documents
              </Button>
              <Popconfirm title="Are you sure?" onConfirm={() => handleDelete(record._id)}>
                <Button size="small" danger>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
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
        size={isTablet ? "small" : "middle"}
        scroll={isTablet ? undefined : { x: 'max-content' }}
      />

      <Modal
        title={editingCollector ? "Edit Collector" : "Add Collector"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item className="collector-input" name="GeneratedIDNumber" label="Generated ID" rules={[{ required: true }]}>
            <Input size="small" />
          </Form.Item>
          <Form.Item className="collector-input" name="Name" label="Name" rules={[{ required: true }] }>
            <Input size="small" />
          </Form.Item>
          <Form.Item className="collector-input" name="ContactNumber" label="Contact">
            <Input size="small" />
          </Form.Item>
          <Form.Item className="collector-input" name="Email" label="Email">
            <Input size="small" />
          </Form.Item>
          <Form.Item name="EmploymentDate" label="Employment Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="AreaRoutes" label="Area Routes">
            <Select
              mode="tags"
              size="medium"
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

          <Form.Item className="collector-input" name="EmploymentStatus" label="Employment Status">
            <Select size="small">
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Suspended">Suspended</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Documents modal */}
      <Modal
        title={activeCollector ? `Documents – ${activeCollector.Name}` : "Documents"}
        open={docsModalOpen}
        onCancel={() => setDocsModalOpen(false)}
        footer={null}
        width={800}
      >
        {/* Top-level tabs: Files, Upload, Add Link */}
        <Tabs
          activeKey={docsActiveTab}
          onChange={setDocsActiveTab}
          items={[
            {
              key: "files",
              label: "Files",
              children: (
                <>
                  {/* Category tabs to arrange files */}
                  <Tabs
                    activeKey={docCategoryFilter}
                    onChange={setDocCategoryFilter}
                    items={[
                      { key: "all", label: "All" },
                      { key: "id", label: "ID" },
                      { key: "requirements", label: "Requirements" },
                      { key: "other", label: "Other" },
                    ]}
                    style={{ marginBottom: 8 }}
                  />

                  <Table
                    size="small"
                    rowKey={(r) => r._id}
                    loading={docsLoading}
                    dataSource={[...collectorDocs]
                      .filter((d) => (docCategoryFilter === "all" ? true : d.category === docCategoryFilter))
                      .sort((a, b) => {
                        const order = { id: 0, requirements: 1, other: 2 };
                        const ca = order[a.category] ?? 99;
                        const cb = order[b.category] ?? 99;
                        if (ca !== cb) return ca - cb;
                        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                      })}
                    columns={[
                      { title: "Name", dataIndex: "name", key: "name" },
                      {
                        title: "Category",
                        dataIndex: "category",
                        key: "category",
                        render: (c) => {
                          const color = c === "id" ? "blue" : c === "requirements" ? "green" : "default";
                          const label = c?.charAt(0)?.toUpperCase() + (c?.slice(1) || "");
                          return <Tag color={color}>{label || "—"}</Tag>;
                        },
                      },
                      {
                        title: "Type",
                        dataIndex: "type",
                        key: "type",
                        render: (t) => {
                          const colorMap = { pdf: "red", image: "gold", doc: "blue", sheet: "green" };
                          return <Tag color={colorMap[t] || "default"}>{t || "other"}</Tag>;
                        },
                        width: 100,
                      },
                      {
                        title: "Size",
                        dataIndex: "size",
                        key: "size",
                        render: (s) => {
                          if (!s && s !== 0) return "—";
                          const i = s === 0 ? 0 : Math.floor(Math.log(s) / Math.log(1024));
                          const v = (s / Math.pow(1024, i)).toFixed(1);
                          const units = ["B", "KB", "MB", "GB", "TB"]; 
                          return `${v} ${units[i] || "B"}`;
                        },
                        width: 90,
                      },
                      { title: "Uploaded", dataIndex: "createdAt", key: "createdAt", render: (v) => (v ? new Date(v).toLocaleString() : "—"), width: 170 },
                      {
                        title: "Actions",
                        key: "actions",
                        render: (_, rec) => (
                          <>
                            <Button size="small" onClick={() => rec.link && window.open(rec.link, "_blank", "noopener")}>
                              Open
                            </Button>
                            <Button
                              size="small"
                              danger
                              style={{ marginLeft: 8 }}
                              icon={<DeleteOutlined />}
                              loading={deletingDocId === rec._id}
                              disabled={deletingDocId === rec._id}
                              onClick={() => handleDeleteDoc(rec)}
                            />
                          </>
                        ),
                        width: 130,
                      },
                    ]}
                    pagination={{ pageSize: 6 }}
                  />
                </>
              ),
            },
            {
              key: "upload",
              label: "Upload",
              children: (
                <>
                  <Form layout="vertical" form={uploadForm} onFinish={handleUpload} disabled={uploading}>
                    <Row gutter={[12, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="category" label="Category" initialValue="id">
                          <Select placeholder="Select category">
                            <Select.Option value="id">ID</Select.Option>
                            <Select.Option value="requirements">Requirements</Select.Option>
                            <Select.Option value="other">Other</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="type" label="Type">
                          <Select allowClear placeholder="Auto-detected if empty">
                            <Select.Option value="image">Image</Select.Option>
                            <Select.Option value="pdf">PDF</Select.Option>
                            <Select.Option value="doc">Doc</Select.Option>
                            <Select.Option value="sheet">Sheet</Select.Option>
                            <Select.Option value="other">Other</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="name" label="Display Name" rules={[{ required: true, message: "Display name required" }]}>
                      <Input placeholder="e.g., Valid ID (Front)" />
                    </Form.Item>
                    <Form.Item
                      name="file"
                      label="File(s)"
                      valuePropName="fileList"
                      getValueFromEvent={(e) => (e && e.fileList ? e.fileList : [])}
                      rules={[{ required: true, message: "Choose file(s)" }]}
                    >
                      <Upload.Dragger
                        multiple
                        beforeUpload={() => false}
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                      >
                        <p className="ant-upload-drag-icon">
                          <UploadOutlined />
                        </p>
                        <p className="ant-upload-text">Click or drag files here</p>
                        <p className="ant-upload-hint">Supported: PDF, images, Word, Excel</p>
                      </Upload.Dragger>
                    </Form.Item>
                    {uploading && (
                      <Form.Item>
                        <Progress percent={uploadPercent} status={uploadPercent === 100 ? "success" : "active"} />
                      </Form.Item>
                    )}
                    <Form.Item>
                      <Button type="primary" htmlType="submit" icon={<UploadOutlined />} loading={uploading}>
                        {uploading ? "Uploading..." : "Upload"}
                      </Button>
                    </Form.Item>
                  </Form>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Drive folders: 
                    <a href="https://drive.google.com/drive/folders/1pHCftymmkGcbEMLtwErESXcD2HteMqIK?usp=sharing" target="_blank" rel="noopener" style={{ marginLeft: 6 }}>Images</a>
                    <span> | </span>
                    <a href="https://drive.google.com/drive/folders/1L_dUl-Xdp3Unl10mGdApVuqZL-W_0YDd?usp=sharing" target="_blank" rel="noopener">Docs</a>
                  </div>
                </>
              ),
            },
            {
              key: "link",
              label: "Add Link",
              children: (
                <Form layout="vertical" onFinish={handleAddLink}>
                  <Row gutter={[12, 0]}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="category" label="Category" initialValue="other">
                        <Select>
                          <Select.Option value="id">ID</Select.Option>
                          <Select.Option value="requirements">Requirements</Select.Option>
                          <Select.Option value="other">Other</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="name" label="Display Name" rules={[{ required: true }] }>
                        <Input placeholder="e.g., Signed Contract" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="link" label="URL" rules={[{ required: true }]}>
                    <Input placeholder="Paste Google Drive link or public URL" />
                  </Form.Item>
                  <Form.Item>
                    <Button htmlType="submit" icon={<LinkOutlined />}>Save Link</Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default CollectorAccounts;