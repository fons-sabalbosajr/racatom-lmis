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
} from "antd";
import { UserOutlined, UploadOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import { decryptData } from "../../../utils/storage";

const Accounts = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [photoFile, setPhotoFile] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);

  useEffect(() => {
    fetchUsers();

    // decrypt onlineUser from localStorage
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

  const isOnline = (username) => currentUsername === username;

  const openEditModal = (user) => {
    setEditingUser(user);
    setPhotoFile(null);
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
      let payload = { ...values };

      if (photoFile) {
        payload.Photo = await toBase64(photoFile);
      }

      await api.put(`/users/${editingUser._id}`, payload);
      message.success("User updated successfully");
      setModalVisible(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("Failed to update user");
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  if (loading)
    return (
      <Spin
        tip="Loading users..."
        size="large"
        style={{ display: "block", margin: "100px auto" }}
      />
    );

  return (
    <div style={{ padding: 20 }}>
      <Row gutter={[16, 16]}>
        {users.map((user) => {
          const online = isOnline(user.Username);
          return (
            <Col key={user._id} xs={24} sm={12} md={8} lg={6}>
              <Badge
                dot
                offset={[-5, 5]}
                style={{ backgroundColor: online ? "#52c41a" : "#f5222d" }}
              >
                <Card
                  hoverable
                  style={{ cursor: "pointer" }}
                  onClick={() => openEditModal(user)}
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
                      <div style={{ marginTop: 8 }}>
                        <div>
                          <strong>Position:</strong> {user.Position}
                        </div>
                        <div>
                          <strong>Email:</strong> {user.Email}
                        </div>
                        <div>
                          <strong>Username:</strong> {user.Username}
                        </div>
                        <div>
                          <strong>Status:</strong>{" "}
                          <span
                            style={{ color: online ? "#52c41a" : "#f5222d" }}
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

      {/* Edit Modal */}
      <Modal
        title="Edit User"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Photo" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
              style={{ marginBottom: 10 }}
            />
            <Upload
              beforeUpload={(file) => {
                setPhotoFile(file);
                return false;
              }}
              showUploadList={false}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>Change Photo</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="FullName"
            label="Full Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="Email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="Position"
            label="Position"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="Username"
            label="Username"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
