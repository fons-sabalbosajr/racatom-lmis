// src/pages/CreateAccount/CreateAccount.jsx
import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message, Select } from "antd";
import api from "../../utils/axios";
import { useNavigate, Link } from "react-router-dom";
import "./createaccount.css";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;
const { Option } = Select;

// Password complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_RULES = [
  { required: true, message: "Enter password" },
  { min: 8, message: "Password must be at least 8 characters" },
  {
    pattern: /[A-Z]/,
    message: "Must contain at least one uppercase letter",
  },
  {
    pattern: /[a-z]/,
    message: "Must contain at least one lowercase letter",
  },
  {
    pattern: /\d/,
    message: "Must contain at least one number",
  },
  {
    pattern: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    message: "Must contain at least one special character",
  },
];

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
    };

    try {
      await api.post(`/auth/register`, payload);
      message.success(
        "Account created! Check your email to verify your account."
      );
      navigate("/login");
    } catch (err) {
      const serverMsg =
        err.response?.data?.message || "Account creation failed. Try again.";
      message.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="create-card">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src={lmisLogo} alt="LMIS Logo" style={{ height: "60px" }} />
        </div>
        <Title
          level={3}
          style={{ textAlign: "center", marginTop: 0 }}
          className="create-title"
        >
          Create Account
        </Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          Register for a new account
        </Text>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Full Name"
            name="FullName"
            rules={[{ required: true, message: "Enter full name" }]}
          >
            <Input placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="Email"
            rules={[
              { required: true, message: "Enter email" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="Email Address" />
          </Form.Item>

          <Form.Item
            label="Username"
            name="Username"
            rules={[
              { required: true, message: "Enter username" },
              { min: 3, message: "Username must be at least 3 characters" },
              { pattern: /^[a-zA-Z0-9_.-]+$/, message: "Only letters, numbers, dots, hyphens, and underscores" },
            ]}
          >
            <Input placeholder="Username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="Password"
            rules={PASSWORD_RULES}
            hasFeedback
          >
            <Input.Password placeholder="Password" className="input-password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="ConfirmPassword"
            dependencies={["Password"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("Password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter password" />
          </Form.Item>

          <Form.Item
            label="Designation"
            name="Designation"
            rules={[{ required: true, message: "Select designation" }]}
          >
            <Select placeholder="Select designation">
              <Option value="Staff">Staff</Option>
              <Option value="Manager">Manager</Option>
              <Option value="User">User</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Text>Already have an account? </Text>
          <Link to="/login">Login</Link>
        </div>

        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginTop: 16 }}
        >
          © {new Date().getFullYear()} RCT Loan Management System
        </Text>
      </Card>
    </div>
  );
}

export default CreateAccount;
