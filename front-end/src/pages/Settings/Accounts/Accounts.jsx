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
} from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import { decryptData } from "../../../utils/storage";
import "./accounts.css";

const { Title } = Typography;
const { Panel } = Collapse;

const Accounts = () => {
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

  useEffect(() => {
    fetchUsers();

    const encrypted = localStorage.getItem("onlineUser");
    if (encrypted) {
      try {
        const username = decryptData(encrypted);
        setCurrentUsername(username);
      } catch (err) {
        console.error("Failed to decrypt online username", err);
      }
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load user accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const encrypted = localStorage.getItem("user"); // already storing logged-in user in Home.jsx
    if (encrypted) {
      try {
        const userObj = decryptData(encrypted);
        setCurrentUser(userObj); // store entire user (includes Position)
      } catch (err) {
        console.error("Failed to decrypt online user", err);
      }
    }
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
        localStorage.setItem("user", JSON.stringify(updatedUser)); // Assuming you store raw JSON, adjust if encrypted
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
        currentUser?.Position === "Developer"
          ? val
          : "*".repeat(2) + val.slice(2),
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

          {currentUser?.Position === "Developer" && (
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
