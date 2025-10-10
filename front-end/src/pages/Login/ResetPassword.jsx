import React, { useState } from "react";
import { Form, Input, Button, Card, message, Typography } from "antd";
import api from "../../utils/axios";
import { useNavigate, useParams } from "react-router-dom";

const { Title } = Typography;

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  const onFinish = async (values) => {
    setLoading(true);
    try {
  await api.post(`/auth/reset-password/${token}`, values);
      message.success("Password reset successful. You can now login.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={3} style={{ textAlign: "center" }}>Reset Password</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="New Password"
            name="Password"
            rules={[{ required: true, message: "Please enter a new password" }]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ResetPassword;
