import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Avatar,
  Badge,
  Spin,
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
} from "antd";
import { UserOutlined, UploadOutlined, DeleteOutlined, StopOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import { swalMessage, swalConfirm } from "../../../utils/swal";
import { lsGet, lsGetSession, lsSet, lsSetSession } from "../../../utils/storage";
import "./accounts.css";
import { useDevSettings } from "../../../context/DevSettingsContext";

const { Title } = Typography;

const Accounts = () => {
  const { settings } = useDevSettings();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => lsGetSession("user") || lsGet("user"));
  const [form] = Form.useForm();
  const [photoFile, setPhotoFile] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [viewMode, setViewMode] = useState("Card"); // "Card" | "Table"
  const [loadError, setLoadError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const abortRef = React.useRef(null);
  // Removed password generator state (moved to Developer Settings > Tools)

  useEffect(() => {
    fetchUsers();

    const username = lsGet("onlineUser");
    if (username) setCurrentUsername(username);
  }, []);

  // Show employee list based on user position
  const isDev = (() => {
    const pos = String(currentUser?.Position || "").trim().toLowerCase();
    return pos === "developer" || pos === "administrator";
  })();

  const fetchUsers = async () => {
    try {
      setLoadError(null);
      // cancel any previous in-flight request
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch (e) {
          void 0;
        }
      }
      const controller = new AbortController();
      abortRef.current = controller;
      // race with a manual timeout (e.g., 12s) to avoid spinner hangs
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 12000)
      );
      const res = await Promise.race([
        api.get("/users", { signal: controller.signal }),
        timeout,
      ]);
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
      if (err.name === "CanceledError" || (err.message && err.message.includes("canceled"))) {
        // This is an expected error when the request is canceled.
        // We can silently ignore it.
        return;
      }
      console.error(err);
      const isTimeout = /timed out/i.test(String(err?.message || ""));
      setLoadError(isTimeout ? "Request timed out. Please try again." : "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userObj = lsGetSession("user") || lsGet("user");
    if (userObj) setCurrentUser(userObj);
  }, []);

  // Prefer server-computed presence; fallback: current tab user is online
  const isOnline = (user) => {
    if (typeof user?.isOnline === "boolean") return user.isOnline;
    const uname = typeof user === "string" ? user : user?.Username;
    return uname && uname === currentUsername;
  };

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
      if (!isDev && editingUser?.Username !== currentUser?.Username) {
        swalMessage.error("You are not allowed to edit this account.");
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
  lsSetSession("user", updatedUser);
        setCurrentUser(updatedUser);
      }

      swalMessage.success("User updated successfully");
      setModalVisible(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      swalMessage.error("Failed to update user");
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      swalMessage.success("User deleted successfully");
      fetchUsers();
    } catch (err) {
      console.error(err);
      swalMessage.error("Failed to delete user");
    }
  };

  const handleMarkResigned = (userId, fullName) => {
    swalConfirm({
      title: "Mark as Resigned?",
      text: `Are you sure you want to mark ${fullName} as resigned? Their account will be scheduled for deletion in 30 days.`,
      icon: "warning",
      confirmButtonText: "Yes, mark resigned",
      confirmButtonColor: "#ff4d4f",
      onOk: async () => {
        try {
          await api.post(`/users/${userId}/mark-resigned`);
          swalMessage.success(`${fullName} has been marked as resigned.`);
          fetchUsers();
        } catch (err) {
          console.error(err);
          swalMessage.error(err.response?.data?.message || "Failed to mark as resigned");
        }
      },
    });
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  // Filter out resigned users from active list
  const activeUsers = users.filter((u) => u.accountStatus !== "resigned");

  // Group users by Position
  const groupedByPosition = activeUsers.reduce((acc, user) => {
    const pos = user.Position || "Uncategorized";
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(user);
    return acc;
  }, {});

  if (loading)
    return (
      <div className="accounts-loading">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <Spin spinning={true}>
            <div>Loading users...</div>
          </Spin>
          {loadError && (
            <>
              <div style={{ color: "#ff4d4f" }}>{loadError}</div>
              <Button
                type="primary"
                loading={retrying}
                onClick={async () => {
                  setRetrying(true);
                  setLoading(true);
                  await fetchUsers();
                  setRetrying(false);
                }}
              >
                Retry
              </Button>
            </>
          )}
        </div>
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
      render: (val) =>
        isDev || !settings.maskUsernames
          ? val
          : "*".repeat(2) + (val || "").slice(2),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
  const online = isOnline(record);
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
          {(isDev || currentUser?.Username === record.Username) && (
            <Button type="link" onClick={() => openEditModal(record)}>
              Edit
            </Button>
          )}

          {isDev && settings.allowUserDelete && (
            <Popconfirm
              title="Are you sure delete this user?"
              onConfirm={() => handleDelete(record._id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}

          {isDev && (
            <Button
              type="link"
              icon={<StopOutlined />}
              style={{ color: "#faad14" }}
              onClick={() => handleMarkResigned(record._id, record.FullName)}
            >
              Mark Resigned
            </Button>
          )}
        </>
      ),
    },
  ];

  // Self-service panel removed: all users see the employee list below with restricted actions for non-developers.

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
                  const online = isOnline(user);
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
                            (isDev ||
                              currentUser?.Username === user.Username) && (
                              <Button
                                size="small"
                                onClick={() => openEditModal(user)}
                                style={{ fontSize: "14px" }}
                              >
                                Edit
                              </Button>
                            ),
                            isDev && (
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
                            isDev && (
                              <Button
                                size="small"
                                icon={<StopOutlined />}
                                style={{ color: "#faad14", fontSize: "14px" }}
                                onClick={() => handleMarkResigned(user._id, user.FullName)}
                              >
                                Resign
                              </Button>
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
                                  {isDev
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
          dataSource={activeUsers}
          rowKey="_id"
          pagination={{ pageSize: 6 }}
        />
      )}

      {/* Password Generator moved to Developer Settings > Tools */}

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
            (!isDev && currentUser?.Username !== editingUser?.Username) || // block non-dev editing others
            (!isDev &&
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
              () => ({
                validator(_, value) {
                  if (
                    !isDev &&
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
            {isDev ? (
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
            {isDev ? (
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
