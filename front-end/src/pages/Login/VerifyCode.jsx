import React, { useState } from "react";
import { Input, Button, Card, Typography } from "antd";
import { SafetyOutlined } from "@ant-design/icons";
import { swalMessage } from "../../utils/swal";
import { useNavigate } from "react-router-dom";
import api from "../../utils/axios";
import { lsSetSession } from "../../utils/storage";
import "./login.css";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;

export default function VerifyCode() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (!code || code.trim().length !== 6) {
      swalMessage.warning("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-code", { code: code.trim() });
      swalMessage.success("Account verified! Redirecting to dashboard...");
      // Refresh user data in session to reflect verified status
      try {
        const meRes = await api.get("/auth/me");
        if (meRes.data?.data?.user) {
          lsSetSession("user", meRes.data.data.user);
        }
      } catch {}
      navigate("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.message || "Verification failed.";
      swalMessage.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-code");
      swalMessage.success("A new verification code has been sent to your email.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to resend code.";
      swalMessage.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-logo-wrapper">
          <img src={lmisLogo} alt="LMIS Logo" className="login-logo" />
        </div>
        <Title level={3} className="login-heading">
          Verify Your Email
        </Title>
        <Text type="secondary" className="login-subheading">
          Enter the 6-digit code sent to your email address.
        </Text>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Input
            prefix={<SafetyOutlined />}
            placeholder="Enter 6-digit code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            size="large"
            style={{
              textAlign: "center",
              fontSize: 24,
              letterSpacing: 12,
              fontWeight: 700,
              maxWidth: 280,
            }}
            onPressEnter={handleVerify}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={handleVerify}
            className="login-submit-btn"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary">Didn't receive the code? </Text>
          <Button type="link" size="small" onClick={handleResend} loading={resending}>
            Resend Code
          </Button>
        </div>

        <Text type="secondary" className="login-copyright">
          © {new Date().getFullYear()} RCT Loan Management Information System
        </Text>
      </Card>
    </div>
  );
}
