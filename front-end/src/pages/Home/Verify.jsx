import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Spin, Typography, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import api from "../../utils/axios";

const { Text } = Typography;

function Verify() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("loading"); // "success" | "error"
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setStatusMessage("Invalid verification link.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/auth/verify-token/${token}`);
        const data = res.data;
        setStatus("success");
        setStatusMessage(data?.message || "Your email has been verified. You may now log in.");
      } catch (err) {
        const code = err?.response?.data?.code;
        const msg = err?.response?.data?.message;
        setStatus("error");
        if (code === "INVALID_OR_EXPIRED") {
          setStatusMessage(msg || "This verification link is invalid or has already been used.");
        } else {
          setStatusMessage(msg || "An error occurred during verification. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="login-container">
      <Card style={{ textAlign: "center", minWidth: 360, maxWidth: 460, borderRadius: 12 }}>
        {loading ? (
          <div style={{ padding: 40 }}>
            <Spin size="large" />
            <Text style={{ display: "block", marginTop: 16 }}>Verifying your email...</Text>
          </div>
        ) : status === "success" ? (
          <Result
            icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            title="Email Verified!"
            subTitle={statusMessage}
            extra={
              <Button type="primary" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
            }
          />
        ) : (
          <Result
            icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
            title="Verification Failed"
            subTitle={statusMessage}
            extra={[
              <Button type="primary" key="login" onClick={() => navigate("/login")}>
                Go to Login
              </Button>,
              <Button key="resend" onClick={() => navigate("/verify-email")}>
                Resend Verification
              </Button>,
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export default Verify;
