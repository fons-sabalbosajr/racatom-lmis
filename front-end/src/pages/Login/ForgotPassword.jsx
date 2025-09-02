import React, { useState } from "react";
import { Form, Input, Button, Card, message, Typography } from "antd";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const { Title } = Typography;

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, values);
      message.success("Password reset email sent. Check your inbox.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={3} style={{ textAlign: "center" }}>Forgot Password</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="Email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Enter a valid email" }
            ]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Send Reset Email
            </Button>
          </Form.Item>
        </Form>

        {/* Back to Login link */}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link to="/login">Back to Login</Link>
        </div>
      </Card>
    </div>
  );
}

export default ForgotPassword;
