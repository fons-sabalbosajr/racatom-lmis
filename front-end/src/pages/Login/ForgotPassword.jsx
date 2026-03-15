import React, { useState, useRef, useEffect } from "react";
import { Form, Input, Button, Card, Typography, Alert } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { swalMessage } from "../../utils/swal";
import api from "../../utils/axios";
import { useNavigate, Link } from "react-router-dom";

import lmisLogo from "../../assets/lmis.svg";

const { Title, Text } = Typography;

const PASSWORD_RULES = [
  { required: true, message: "Please enter a new password" },
  { min: 8, message: "Password must be at least 8 characters" },
  { pattern: /[A-Z]/, message: "Must contain at least one uppercase letter" },
  { pattern: /[a-z]/, message: "Must contain at least one lowercase letter" },
  { pattern: /\d/, message: "Must contain at least one number" },
  { pattern: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, message: "Must contain at least one special character" },
];

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [code, setCode] = useState(Array(6).fill(""));
  const [resendTimer, setResendTimer] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [locked, setLocked] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Step 1: Send code
  const handleSendCode = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", values);
      setEmail(values.Email);
      setMaskedEmail(res.data.maskedEmail || values.Email);
      setStep(2);
      setResendTimer(60);
      setAttemptsLeft(3);
      setLocked(false);
      swalMessage.success("A verification code has been sent to your email.");
    } catch (err) {
      if (err.response?.data?.locked) {
        setLocked(true);
        setLockMsg(err.response.data.message);
      } else {
        // generic — still advance to prevent email enumeration
        setEmail(values.Email);
        setMaskedEmail(values.Email.replace(/^(.{2}).*@/, "$1***@"));
        setStep(2);
        setResendTimer(60);
        setAttemptsLeft(3);
        swalMessage.success("If an account exists with that email, a verification code has been sent.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (codeStr) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-reset-code", { Email: email, code: codeStr });
      setResetToken(res.data.resetToken);
      setStep(3);
      swalMessage.success("Code verified. Please set your new password.");
    } catch (err) {
      const data = err.response?.data || {};
      if (data.locked) {
        setLocked(true);
        setLockMsg(data.message);
      } else {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
        swalMessage.error(data.message || "Invalid or expired code.");
      }
      setCode(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (values) => {
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${resetToken}`, { Password: values.Password });
      swalMessage.success("Password reset successful. You can now login.");
      navigate("/login");
    } catch (err) {
      swalMessage.error(err.response?.data?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    try {
      await api.post("/auth/resend-forgot-code", { Email: email });
      setResendTimer(60);
      setCode(Array(6).fill(""));
      setAttemptsLeft(3);
      setLocked(false);
      swalMessage.success("A new verification code has been sent.");
    } catch (err) {
      if (err.response?.data?.locked) {
        setLocked(true);
        setLockMsg(err.response.data.message);
      } else {
        swalMessage.error("Failed to resend code. Please try again.");
      }
    }
  };

  // Code input handlers
  const handleCodeChange = (val, idx) => {
    if (locked) return;
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...code];
    updated[idx] = digit;
    setCode(updated);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (updated.every((d) => d !== "")) handleVerifyCode(updated.join(""));
  };
  const handleCodeKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };
  const handleCodePaste = (e) => {
    e.preventDefault();
    if (locked) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...code];
    for (let i = 0; i < 6; i++) updated[i] = pasted[i] || "";
    setCode(updated);
    const nextEmpty = updated.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (updated.every((d) => d !== "")) handleVerifyCode(updated.join(""));
  };

  const subtitles = {
    1: "Enter the email address associated with your account.",
    2: `We sent a 6-digit code to ${maskedEmail}. Enter it below.`,
    3: "Enter your new password below.",
  };

  return (
    <div className="login-container">
      <div className="login-main-wrapper">
      <Card className="login-card">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src={lmisLogo} alt="LMIS Logo" style={{ height: "60px" }} />
        </div>
        <Title level={3} style={{ textAlign: "center", marginTop: 0 }}>
          {step === 3 ? "Reset Password" : "Forgot Password"}
        </Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          {subtitles[step]}
        </Text>

        {/* Step 1: Email */}
        {step === 1 && (
          <>
            {locked && <Alert type="error" message={lockMsg} showIcon style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={handleSendCode}>
              <Form.Item
                label="Email"
                name="Email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Enter your email" size="middle" disabled={locked} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading} disabled={locked}>
                  Send Verification Code
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        {/* Step 2: Enter Code */}
        {step === 2 && (
          <>
            {locked ? (
              <Alert type="error" message={lockMsg} showIcon style={{ marginBottom: 16 }} />
            ) : (
              attemptsLeft < 3 && (
                <Alert
                  type="warning"
                  message={`${attemptsLeft} attempt(s) remaining before 1-hour lockout.`}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              {code.map((digit, idx) => (
                <Input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  value={digit}
                  onChange={(e) => handleCodeChange(e.target.value, idx)}
                  onKeyDown={(e) => handleCodeKeyDown(e, idx)}
                  onPaste={idx === 0 ? handleCodePaste : undefined}
                  maxLength={1}
                  style={{ width: 48, height: 48, textAlign: "center", fontSize: 22, fontWeight: 600 }}
                  disabled={loading || locked}
                />
              ))}
            </div>
            {!locked && (
              <div style={{ textAlign: "center" }}>
                <Button type="link" disabled={resendTimer > 0} onClick={handleResend}>
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
                </Button>
              </div>
            )}
            {locked && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Button type="primary" onClick={() => navigate("/login")}>Return to Login</Button>
              </div>
            )}
          </>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <Form layout="vertical" onFinish={handleResetPassword}>
            <Form.Item label="New Password" name="Password" rules={PASSWORD_RULES} hasFeedback>
              <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" size="middle" />
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
                    if (!value || getFieldValue("Password") === value) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Re-enter new password" size="middle" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Reset Password
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link to="/login">Back to Login</Link>
        </div>

        <Text type="secondary" style={{ display: "block", textAlign: "center", marginTop: 16 }}>
          © {new Date().getFullYear()} RCT Loan Management Information System
        </Text>
      </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;
