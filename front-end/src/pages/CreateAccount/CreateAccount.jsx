// src/pages/CreateAccount/CreateAccount.jsx
import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message, Select } from "antd";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";
import "./createAccount.css";

const { Title } = Typography;
const { Option } = Select;

function CreateAccount() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      FullName: values.FullName?.trim(),
      Email: values.Email?.trim(),
      Username: values.Username?.trim(),
      Password: values.Password?.trim(),
      Designation: values.Designation,
      Position: values.Position?.trim(),
    };

    try {
  await api.post(`/auth/register`, payload);
      message.success("Account created! Check your email to verify your account.");
      navigate("/login");
    } catch (err) {
      const serverMsg = err.response?.data?.message || "Account creation failed. Try again.";
      message.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={3} style={{ textAlign: "center" }}>Create Account</Title>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Full Name" name="FullName" rules={[{ required: true, message: "Enter full name" }]}>
            <Input placeholder="Full Name" />
          </Form.Item>

          <Form.Item label="Email" name="Email" rules={[{ required: true, message: "Enter email" }, { type: "email", message: "Invalid email" }]}>
            <Input placeholder="Email Address" />
          </Form.Item>

          <Form.Item label="Username" name="Username" rules={[{ required: true, message: "Enter username" }]}>
            <Input placeholder="Username" />
          </Form.Item>

          <Form.Item label="Password" name="Password" rules={[{ required: true, message: "Enter password" }]}>
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item label="Designation" name="Designation" rules={[{ required: true, message: "Select designation" }]}>
            <Select placeholder="Select designation">
              <Option value="Administrator">Administrator</Option>
              <Option value="Staff">Staff</Option>
              <Option value="Manager">Manager</Option>
              <Option value="User">User</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Position" name="Position">
            <Input placeholder="Position (optional)" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Button type="link" onClick={() => navigate("/login")}>Back to Login</Button>
        </div>
      </Card>
    </div>
  );
}

export default CreateAccount;
