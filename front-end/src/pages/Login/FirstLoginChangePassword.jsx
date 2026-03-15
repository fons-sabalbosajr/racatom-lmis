import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Result } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { swalMessage } from "../../utils/swal";
import { useNavigate } from "react-router-dom";
import api from "../../utils/axios";
import "./login.css";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;

const PASSWORD_RULES = [
  { required: true, message: "Enter new password" },
  { min: 8, message: "Password must be at least 8 characters" },
  { pattern: /[A-Z]/, message: "Must contain at least one uppercase letter" },
  { pattern: /[a-z]/, message: "Must contain at least one lowercase letter" },
  { pattern: /\d/, message: "Must contain at least one number" },
  { pattern: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, message: "Must contain at least one special character" },
];

export default function FirstLoginChangePassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.put("/auth/first-login-change-password", {
        newPassword: values.newPassword,
      });

      if (res.data?.skipVerification) {
        swalMessage.success("Password changed. Your account is now active!");
        navigate("/dashboard");
      } else {
        swalMessage.success("Password changed! A verification code has been sent to your email.");
        navigate("/verify-code");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to change password.";
      swalMessage.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-logo-wrapper">
          <img src={lmisLogo} alt="LMIS Logo" className="login-logo" />
        </div>
        <Title level={3} className="login-heading">
          Change Your Password
        </Title>
        <Text type="secondary" className="login-subheading">
          For your security, please set a new password before continuing.
        </Text>

        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={PASSWORD_RULES}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="New Password"
              size="middle"
            />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
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
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              className="login-submit-btn"
            >
              {loading ? "Saving..." : "Set New Password"}
            </Button>
          </Form.Item>
        </Form>

        <Text type="secondary" className="login-copyright">
          © {new Date().getFullYear()} RCT Loan Management Information System
        </Text>
      </Card>
    </div>
  );
}
