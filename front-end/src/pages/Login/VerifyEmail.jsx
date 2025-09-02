// src/pages/VerifyEmail/VerifyEmail.jsx
import React, { useState } from "react";
import { Form, Input, Button, Typography, Card, Divider, message } from "antd";
import { UserOutlined, MailOutlined } from "@ant-design/icons";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;

function VerifyEmail() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const prefill = location.state?.identifier?.trim() || "";

  const handleResend = async (values) => {
    const identifier = values.Identifier?.trim();
    if (!identifier) {
      message.error("Please enter your username or email.");
      return;
    }

    setLoading(true);
    try {
      const payload = identifier.includes("@") ? { email: identifier } : { username: identifier };
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, payload);

      message.success(response.data?.message || "✅ Verification email resent. Check your inbox.");
    } catch (err) {
      console.error("Resend verification error:", err);

      const serverMessage = err.response?.data?.error || err.response?.data?.details;
      message.error(serverMessage || "⚠️ Failed to resend verification email. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const inputPrefix = prefill.includes("@") ? <MailOutlined /> : <UserOutlined />;

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={3} style={{ textAlign: "center" }}>Verify Your Email</Title>

        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          Please verify your email to continue using the system.
        </Text>

        <Form
          name="verify-email"
          layout="vertical"
          onFinish={handleResend}
          initialValues={{ Identifier: prefill }}
        >
          <Form.Item
            label="Username or Email"
            name="Identifier"
            rules={[{ required: true, message: "Please enter your username or email" }]}
          >
            <Input prefix={inputPrefix} placeholder="Enter username or email" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              {loading ? "Sending..." : "Resend Verification Email"}
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ fontSize: 12, color: "#999" }}>or</Divider>

        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <Text>Already have an account? </Text>
          <Link to="/login">Login</Link>
        </div>

        <Text type="secondary" style={{ display: "block", textAlign: "center", marginTop: 16 }}>
          © {new Date().getFullYear()} RCT Loan Management System
        </Text>
      </Card>
    </div>
  );
}

export default VerifyEmail;
