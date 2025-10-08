import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Avatar,
  Badge,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Upload,
  Button,
  Typography,
  Segmented,
  Collapse,
  Table,
  Popconfirm,
  Space, Switch
} from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import { lsGet, lsSet } from "../../../utils/storage";
import "./accounts.css";
import { useDevSettings } from "../../../context/DevSettingsContext";

const { Title } = Typography;
const { Panel } = Collapse;

const Accounts = () => {
  const { settings } = useDevSettings();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [form] = Form.useForm();
  const [photoFile, setPhotoFile] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [viewMode, setViewMode] = useState("Card"); // "Card" | "Table"
  const [genLength, setGenLength] = useState(12);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genOutput, setGenOutput] = useState("");

  useEffect(() => {
    fetchUsers();

    const username = lsGet("onlineUser");
    if (username) setCurrentUsername(username);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      const raw = Array.isArray(res.data) ? res.data : [];
      // Deduplicate by Username (fallback to _id) to avoid double cards
      const seen = new Set();
      const unique = [];
      for (const u of raw) {
        const key = (u && (u.Username || u._id)) ?? Math.random().toString();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(u);
        }
      }
      setUsers(unique);
    } catch (err) {
      console.error(err);
      message.error("Failed to load user accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userObj = lsGet("user");
    if (userObj) setCurrentUser(userObj);
  }, []);

  const isOnline = (username) => currentUsername === username;

  const openEditModal = (user) => {
    setEditingUser(user);
    setPhotoFile(null);
    form.resetFields(); // 🔥 important
    form.setFieldsValue({
      FullName: user.FullName,
      Email: user.Email,
      Position: user.Position,
      Username: user.Username,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // Restrict non-developers from editing others
      if (
        currentUser?.Position !== "Developer" &&
        editingUser?.Username !== currentUser?.Username
      ) {
        message.error("You are not allowed to edit this account.");
        return;
      }

      let payload = { ...values };

      if (photoFile) {
        payload.Photo = await toBase64(photoFile);
      }

      const res = await api.put(`/users/${editingUser._id}`, payload);

      // If editing your own profile, update the user data in localStorage
      if (editingUser?._id === currentUser?._id) {
        const updatedUser = res.data;
        lsSet("user", updatedUser);
        setCurrentUser(updatedUser);
      }

      message.success("User updated successfully");
      setModalVisible(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("Failed to update user");
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      message.success("User deleted successfully");
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete user");
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  // Group users by Position
  const groupedByPosition = users.reduce((acc, user) => {
    const pos = user.Position || "Uncategorized";
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(user);
    return acc;
  }, {});

  if (loading)
    return (
      <div className="accounts-loading">
        <Spin spinning={true}>
          <div>Loading users...</div>
        </Spin>
      </div>
    );

  // Table columns
  const columns = [
    {
      title: "Photo",
      dataIndex: "Photo",
      key: "Photo",
      render: (photo) => (
        <Avatar
          src={photo ? `data:image/jpeg;base64,${photo}` : null}
          icon={!photo && <UserOutlined />}
        />
      ),
    },
    { title: "Full Name", dataIndex: "FullName", key: "FullName" },
    { title: "Email", dataIndex: "Email", key: "Email" },
    { title: "Position", dataIndex: "Position", key: "Position" },
    {
      title: "Username",
      dataIndex: "Username",
      key: "Username",
      render: (val, record) =>
        currentUser?.Position === "Developer" || !settings.maskUsernames
          ? val
          : "*".repeat(2) + (val || "").slice(2),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const online = isOnline(record.Username);
        return (
          <span className={online ? "status-online" : "status-offline"}>
            {online ? "Online" : "Offline"}
          </span>
        );
      },
    },
    {
      title: "Verified",
      dataIndex: "isVerified",
      key: "isVerified",
      render: (val) => (val ? "Yes" : "No"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          {(currentUser?.Position === "Developer" ||
            currentUser?.Username === record.Username) && (
            <Button type="link" onClick={() => openEditModal(record)}>
              Edit
            </Button>
          )}

          {currentUser?.Position === "Developer" && settings.allowUserDelete && (
            <Popconfirm
              title="Are you sure delete this user?"
              onConfirm={() => handleDelete(record._id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="accounts-container">
      <Title level={3} className="accounts-title">
        Employee List Accounts
      </Title>

      <div className="accounts-toggle">
        <Segmented
          options={["Card", "Table"]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      {/* --- CARD VIEW --- */}
      {viewMode === "Card" ? (
        <Collapse
          accordion={false}
          defaultActiveKey={Object.keys(groupedByPosition)}
          items={Object.keys(groupedByPosition).map((position) => ({
            key: position,
            label: position,
            children: (
              <Row gutter={[16, 16]} className="accounts-row">
                {groupedByPosition[position].map((user) => {
                  const online = isOnline(user.Username);
                  return (
                    <Col
                      key={user._id}
                      xs={24}
                      sm={12}
                      md={8}
                      lg={6}
                      className="account-col" // ← added
                    >
                      <Badge
                        dot
                        offset={[-5, 5]}
                        style={{
                          backgroundColor: online ? "#52c41a" : "#f5222d",
                        }}
                      >
                        <Card
                          className="account-card"
                          hoverable
                          actions={[
                            (currentUser?.Position === "Developer" ||
                              currentUser?.Username === user.Username) && (
                              <Button
                                size="small"
                                onClick={() => openEditModal(user)}
                                style={{ fontSize: "14px" }}
                              >
                                Edit
                              </Button>
                            ),
                            currentUser?.Position === "Developer" && (
                              <Popconfirm
                                title="Are you sure you want to delete this user?"
                                onConfirm={() => handleDelete(user._id)}
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                >
                                  Delete
                                </Button>
                              </Popconfirm>
                            ),
                          ]}
                        >
                          <Card.Meta
                            avatar={
                              <Avatar
                                src={
                                  user.Photo
                                    ? `data:image/jpeg;base64,${user.Photo}`
                                    : null
                                }
                                icon={!user.Photo && <UserOutlined />}
                                size={64}
                              />
                            }
                            title={user.FullName}
                            description={
                              <div className="account-card-details">
                                <div>
                                  <strong>Position:</strong> {user.Position}
                                </div>
                                <div>
                                  <strong>Email:</strong> {user.Email}
                                </div>
                                <div>
                                  <strong>Username:</strong>{" "}
                                  {currentUser?.Position === "Developer"
                                    ? user.Username
                                    : "*".repeat(2) + user.Username.slice(2)}
                                </div>
                                <div>
                                  <strong>Status:</strong>{" "}
                                  <span
                                    className={
                                      online
                                        ? "status-online"
                                        : "status-offline"
                                    }
                                  >
                                    {online ? "Online" : "Offline"}
                                  </span>
                                </div>
                                <div>
                                  <strong>Verified:</strong>{" "}
                                  {user.isVerified ? "Yes" : "No"}
                                </div>
                              </div>
                            }
                          />
                        </Card>
                      </Badge>
                    </Col>
                  );
                })}
              </Row>
            ),
          }))}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          pagination={{ pageSize: 6 }}
        />
      )}

      {/* Password Generator (available to all users) */}
      <Card size="small" style={{ marginTop: 16 }} title="Password Generator">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 90 }}>Length:</span>
                <Input
                  type="number"
                  min={6}
                  max={64}
                  value={genLength}
                  onChange={(e) => setGenLength(Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 90 }}>Uppercase:</span>
                <Switch checked={genUpper} onChange={setGenUpper} />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 90 }}>Lowercase:</span>
                <Switch checked={genLower} onChange={setGenLower} />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 90 }}>Digits:</span>
                <Switch checked={genDigits} onChange={setGenDigits} />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 90 }}>Symbols:</span>
                <Switch checked={genSymbols} onChange={setGenSymbols} />
              </div>
              <Space>
                <Button onClick={() => {
                  const pools = [];
                  if (genUpper) pools.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
                  if (genLower) pools.push("abcdefghijkmnopqrstuvwxyz");
                  if (genDigits) pools.push("23456789");
                  if (genSymbols) pools.push("!@#$%^&*()-_=+[]{}");
                  if (pools.length === 0) { message.error("Select at least one character set"); return; }
                  const pick = (s) => s[Math.floor(Math.random() * s.length)];
                  let pwd = pools.map(pick).join("");
                  const all = pools.join("");
                  for (let i = pwd.length; i < genLength; i++) pwd += pick(all);
                  pwd = pwd.split("").sort(() => Math.random() - 0.5).join("");
                  setGenOutput(pwd);
                }}>Generate</Button>
                <Button onClick={() => { navigator.clipboard.writeText(genOutput || ""); message.success("Copied to clipboard"); }} disabled={!genOutput}>Copy</Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Input.TextArea rows={3} value={genOutput} readOnly placeholder="Generated password will appear here" />
          </Col>
        </Row>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit User"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields(); // reset form to avoid stale refs
        }}
        onOk={handleSave}
        okText="Save"
        okButtonProps={{
          disabled:
            form.getFieldsError().some(({ errors }) => errors.length) || // block if validation errors
            (currentUser?.Position !== "Developer" &&
              currentUser?.Username !== editingUser?.Username) || // block non-dev editing others
            (currentUser?.Position !== "Developer" &&
              editingUser?._id === currentUser?._id &&
              form.getFieldValue("Position")?.trim().toLowerCase() ===
                "developer"), // block self-promotion to Developer
        }}
      >
        <Form form={form} layout="vertical">
          {/* Profile Photo always visible */}
          <Form.Item label="Photo">
            <div className="photo-upload-wrapper">
              <Avatar
                src={
                  photoFile
                    ? URL.createObjectURL(photoFile)
                    : editingUser?.Photo
                    ? `data:image/jpeg;base64,${editingUser.Photo}`
                    : null
                }
                icon={!editingUser?.Photo && <UserOutlined />}
                size={80}
                className="photo-avatar"
              />
              <Upload
                beforeUpload={(file) => {
                  setPhotoFile(file);
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} className="photo-upload-btn">
                  Change Photo
                </Button>
              </Upload>
            </div>
          </Form.Item>

          {/* Full Name */}
          <Form.Item
            name="FullName"
            label="Full Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          {/* Email */}
          <Form.Item
            name="Email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>

          {/* Position */}
          <Form.Item
            name="Position"
            label="Position"
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (
                    currentUser?.Position !== "Developer" &&
                    editingUser?._id === currentUser?._id &&
                    value?.trim().toLowerCase() === "developer"
                  ) {
                    return Promise.reject(
                      new Error(
                        '❌ You cannot set your Position to "Developer".'
                      )
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            {currentUser?.Position === "Developer" ? (
              <Input />
            ) : editingUser?._id === currentUser?._id ? (
              <Input />
            ) : (
              <Input disabled value={editingUser?.Position} />
            )}
          </Form.Item>

          {/* Username */}
          <Form.Item
            name="Username"
            label="Username"
            rules={[{ required: true }]}
          >
            {currentUser?.Position === "Developer" ? (
              <Input />
            ) : (
              <Input
                disabled={editingUser?._id !== currentUser?._id}
                value={editingUser?.Username ? editingUser.Username : ""}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
