import React, { useState, useEffect } from "react";
import { Form, Input, Button, Typography, message, Card, Divider } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { encryptData } from "../../utils/storage";
import "./login.css";

const { Title, Text } = Typography;

function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Handle email verification result
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get("verified");

    if (verified === "success") {
      message.success("✅ Email verified successfully. You can now log in.");
    } else if (verified === "failed") {
      message.error("❌ Verification link is invalid or expired.");
    } else if (verified === "error") {
      message.error("⚠️ Something went wrong during verification.");
    }
  }, [location]);

  const onFinish = async (values) => {
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          Username: values.Username?.trim(),
          Password: values.Password?.trim(),
        },
        { withCredentials: true } // important for cookie
      );

      const user = res.data?.data?.user;
      if (!user) throw new Error("Invalid server response.");

      localStorage.setItem("user", encryptData(user));
      // mark user as online
      localStorage.setItem("onlineUser", encryptData(user.Username));
      message.success(`Welcome, ${user.FullName || values.Username}`);

      navigate("/"); // redirect to Home
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || "Login failed.";

      if (status === 403 && serverMsg.toLowerCase().includes("not verified")) {
        message.warning("Account not verified. Check your email.");
        navigate("/verify-email", { state: { identifier: values.Username } });
      } else if (status === 401) {
        message.error("Invalid username or password.");
      } else {
        message.error(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={3} style={{ textAlign: "center" }}>
          RCT Loan Management System
        </Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          Secure access to your account
        </Text>

        <Form name="login" layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Username"
            name="Username"
            rules={[{ required: true, message: "Please enter your username" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="Password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <div style={{ textAlign: "right", marginBottom: "1rem" }}>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>or</Divider>

        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <Text>Don’t have an account? </Text>
          <Link to="/create-account">Create one</Link>
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

export default Login;
