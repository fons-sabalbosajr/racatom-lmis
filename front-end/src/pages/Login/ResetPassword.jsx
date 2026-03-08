import React, { useState } from "react";
import { Form, Input, Button, Card, message, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import api from "../../utils/axios";
import { useNavigate, useParams, Link } from "react-router-dom";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;

// Password complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_RULES = [
  { required: true, message: "Please enter a new password" },
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

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { Password: values.Password });
      message.success("Password reset successful. You can now login.");
      navigate("/login");
    } catch (err) {
      message.error(err.response?.data?.message || "Reset failed. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src={lmisLogo} alt="LMIS Logo" style={{ height: "60px" }} />
        </div>
        <Title level={3} style={{ textAlign: "center", marginTop: 0 }}>Reset Password</Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          Enter your new password below
        </Text>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="New Password"
            name="Password"
            rules={PASSWORD_RULES}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter new password"
              size="middle"
            />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="ConfirmPassword"
            dependencies={["Password"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your new password" },
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
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Re-enter new password"
              size="middle"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Reset Password
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link to="/login">Back to Login</Link>
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

export default ResetPassword;
