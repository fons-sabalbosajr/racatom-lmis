import React, { useState, useEffect } from "react";
import { Form, Input, Button, Typography, message, Card, Divider, Spin, Tag, Badge, Collapse } from "antd";
import {
  LockOutlined,
  UserOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api, { setRuntimeToken } from "../../utils/axios";
import { useDevSettings } from "../../context/DevSettingsContext";
import { lsSet, lsSetSession } from "../../utils/storage";
import axios from "axios";
import dayjs from "dayjs";
import "./login.css";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;

function Login() {
  const [loading, setLoading] = useState(false);
  const [postAuthLoading, setPostAuthLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshTheme } = useDevSettings();

  // Fetch public announcements for login page
  useEffect(() => {
    const fetchPublic = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || "";
        const { data } = await axios.get(`${base}/api/announcements/public`);
        if (data?.announcements) setAnnouncements(data.announcements);
      } catch {}
    };
    fetchPublic();
  }, []);

  // ✅ Handle email verification result
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get("verified");

    if (verified === "success") {
      message.success("Email verified successfully. You can now log in.");
    } else if (verified === "failed") {
      message.error("Verification link is invalid or expired.");
    } else if (verified === "error") {
      message.error("Something went wrong during verification.");
    }

    // Show idle-timeout message if redirected from auto-logout
    const reason = params.get("reason");
    if (reason === "idle") {
      message.info("You were logged out due to inactivity.");
    }
  }, [location]);

  const onFinish = async (values) => {
    setLoading(true);

    try {
      const res = await api.post(`/auth/login`, {
  identifier: values.Username?.trim(),
        Password: values.Password?.trim(),
      });

      const user = res.data?.data?.user;
      const token = res.data?.data?.token;
      if (!user) throw new Error("Invalid server response.");

      // Store user and token in sessionStorage via our storage utils by scoping to this window
      // We temporarily override localStorage with sessionStorage wrapper for these keys
      if (token) {
        // Persist token encrypted for this tab/window only
        // use our session-scoped helper so key + value are obfuscated
        try {
          const { lsSetSession } = await import("../../utils/storage");
          lsSetSession("token", token);
        } catch {}
  // Do not keep a plain sessionStorage token; rely on encrypted storage + runtime header
        // Also set axios runtime header immediately so follow-up calls carry the token
        try { setRuntimeToken(token, "session"); } catch {}
      }
  // Store per tab/window to isolate multiple users on same machine/browser
  lsSetSession("user", user);
      // mark user as online
      lsSet("onlineUser", user.Username);
      //message.success(`Welcome, ${user.FullName || values.Username}`);
      // Pull and apply theme immediately (no flash) before routing; show a small overlay while doing so
      try {
        setPostAuthLoading(true);
        await refreshTheme();
      } catch {} finally {
        setPostAuthLoading(false);
      }
      navigate("/dashboard"); // land on protected dashboard
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
      {postAuthLoading && (
        <div className="login-post-auth-overlay">
          <div className="login-post-auth-inner">
            <Spin size="large" />
            <Typography.Text type="secondary">Applying your theme…</Typography.Text>
          </div>
        </div>
      )}

      <div className="login-main-wrapper">
        <Card className="login-card">
          <div className="login-logo-wrapper">
            <img src={lmisLogo} alt="LMIS Logo" className="login-logo" />
          </div>
          <Title level={3} className="login-heading">
            RCT Loan Management System
          </Title>
          <Text type="secondary" className="login-subheading">
            Secure access to your account
          </Text>

          <Form name="login" layout="vertical" onFinish={onFinish} className="login-form">
            <Form.Item
              label="Username or Email"
              name="Username"
              rules={[{ required: true, message: "Please enter your username" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Username or Email"
                size="middle"
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
                size="middle"
              />
            </Form.Item>

            <div className="login-forgot-row">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                className="login-submit-btn"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>or</Divider>

          <div className="login-create-account">
            <Text>Don't have an account? </Text>
            <Link to="/create-account">Create one</Link>
          </div>

          <Text type="secondary" className="login-copyright">
            © {new Date().getFullYear()} RCT Loan Management System
          </Text>
        </Card>

      {/* Bulletin Dropdown — System Announcements */}
      {announcements.length > 0 && (
        <div className="login-bulletin">
          <Collapse
            ghost
            defaultActiveKey={["bulletin"]}
            expandIconPosition="end"
            className="login-bulletin-collapse"
            items={[
              {
                key: "bulletin",
                label: (
                  <div className="login-bulletin-trigger">
                    <NotificationOutlined className="login-bulletin-icon" />
                    <span className="login-bulletin-label">Updates & Announcements</span>
                    <Badge
                      count={announcements.length}
                      style={{
                        backgroundColor: "#1677ff",
                        fontSize: 11,
                        fontWeight: 700,
                        boxShadow: "none",
                      }}
                      size="small"
                    />
                  </div>
                ),
                children: (
                  <div className="login-bulletin-list">
                    {announcements.map((a) => (
                      <div key={a._id} className="login-bulletin-item">
                        <div className="login-bulletin-item-header">
                          <div className="login-bulletin-item-left">
                            <BulbOutlined
                              className="login-bulletin-item-dot"
                              style={{
                                color:
                                  a.Priority === "urgent"
                                    ? "#ff4d4f"
                                    : a.Priority === "high"
                                    ? "#fa8c16"
                                    : a.Priority === "normal"
                                    ? "#1677ff"
                                    : "#8c8c8c",
                              }}
                            />
                            <span className="login-bulletin-item-title">{a.Title}</span>
                          </div>
                          {(a.Priority === "urgent" || a.Priority === "high") && (
                            <Tag
                              color={a.Priority === "urgent" ? "red" : "orange"}
                              className="login-bulletin-priority-tag"
                            >
                              {a.Priority === "urgent" ? "URGENT" : "IMPORTANT"}
                            </Tag>
                          )}
                        </div>
                        <div className="login-bulletin-item-body">
                          {a.Content.split("\n").map((line, i) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <br key={i} />;
                            if (trimmed.startsWith("•")) {
                              return (
                                <div key={i} className="login-bulletin-bullet">
                                  <span className="login-bulletin-bullet-icon">›</span>
                                  <span>{trimmed.slice(1).trim()}</span>
                                </div>
                              );
                            }
                            return <p key={i} className="login-bulletin-paragraph">{trimmed}</p>;
                          })}
                        </div>
                        <div className="login-bulletin-item-meta">
                          <ClockCircleOutlined style={{ fontSize: 11 }} />
                          <span>{dayjs(a.PostedDate).format("MMM DD, YYYY")}</span>
                          {a.PostedBy && (
                            <span className="login-bulletin-author">— {a.PostedBy}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
      </div>
    </div>
  );
}

export default Login;
