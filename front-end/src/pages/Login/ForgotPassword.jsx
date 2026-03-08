import React, { useState } from "react";
import { Form, Input, Button, Card, message, Typography } from "antd";
import { MailOutlined } from "@ant-design/icons";
import api from "../../utils/axios";
import { useNavigate, Link } from "react-router-dom";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await api.post(`/auth/forgot-password`, values);
    } catch {
      // Swallow error intentionally — do not reveal whether the email exists
    } finally {
      setLoading(false);
      setSubmitted(true);
      // Always show generic success to prevent email enumeration
      message.success("If an account exists with that email, a reset link has been sent.");
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src={lmisLogo} alt="LMIS Logo" style={{ height: "60px" }} />
        </div>
        <Title level={3} style={{ textAlign: "center", marginTop: 0 }}>Forgot Password</Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          {submitted
            ? "Check your inbox for the password reset link."
            : "Enter the email address associated with your account."}
        </Text>

        {!submitted ? (
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Email"
              name="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Enter a valid email" }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Enter your email" size="middle" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Send Reset Email
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Button type="primary" block onClick={() => navigate("/login")}>
            Return to Login
          </Button>
        )}

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

export default ForgotPassword;
