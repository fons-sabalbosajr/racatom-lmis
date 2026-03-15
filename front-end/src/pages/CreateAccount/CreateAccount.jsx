// src/pages/CreateAccount/CreateAccount.jsx
import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Select, Result } from "antd";
import { UserOutlined, MailOutlined } from "@ant-design/icons";
import api from "../../utils/axios";
import { useNavigate, Link } from "react-router-dom";
import "./createaccount.css";

import lmisLogo from "../../assets/lmis.svg";
import { swalMessage } from "../../utils/swal";

const { Title, Text } = Typography;
const { Option } = Select;

function CreateAccount() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      FullName: values.FullName?.trim(),
      Email: values.Email?.trim(),
      Designation: values.Designation,
    };

    try {
      await api.post(`/auth/register`, payload);
      setSubmitted(true);
    } catch (err) {
      const serverMsg =
        err.response?.data?.message || "Registration request failed. Try again.";
      swalMessage.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-container">
        <Card className="create-card">
          <Result
            status="success"
            title="Request Submitted!"
            subTitle="Your account request has been submitted for review. The developer will create your credentials and notify you via email once approved."
            extra={[
              <Button type="primary" key="login" onClick={() => navigate("/login")}>
                Back to Login
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="login-container">
      <Card className="create-card">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src={lmisLogo} alt="LMIS Logo" style={{ height: "60px" }} />
        </div>
        <Title
          level={3}
          style={{ textAlign: "center", marginTop: 0 }}
          className="create-title"
        >
          Request Account
        </Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          Submit a request to create your account. A developer will review and set up your credentials.
        </Text>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Full Name"
            name="FullName"
            rules={[{ required: true, message: "Enter full name" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="Email"
            rules={[
              { required: true, message: "Enter email" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email Address" />
          </Form.Item>

          <Form.Item
            label="Designation"
            name="Designation"
            rules={[{ required: true, message: "Select designation" }]}
          >
            <Select placeholder="Select designation">
              <Option value="Staff">Staff</Option>
              <Option value="Manager">Manager</Option>
              <Option value="User">User</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Text>Already have an account? </Text>
          <Link to="/login">Login</Link>
        </div>

        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginTop: 16 }}
        >
          © {new Date().getFullYear()} RCT Loan Management Information System
        </Text>
      </Card>
    </div>
  );
}

export default CreateAccount;
