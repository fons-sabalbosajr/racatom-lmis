import React, { useEffect, useState } from "react";
import { Table, Avatar, Button, Typography, Spin, Tag } from "antd";
import { UserOutlined, MailOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import { swalMessage } from "../../../utils/swal";
import dayjs from "dayjs";
import "./resignedEmployees.css";

const { Title } = Typography;

const ResignedEmployees = () => {
  const [resigned, setResigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);

  const fetchResigned = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/resigned");
      setResigned(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      swalMessage.error("Failed to load resigned employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResigned();
  }, []);

  const handleSendReminder = async (userId, fullName) => {
    try {
      setSendingId(userId);
      await api.post(`/users/${userId}/send-resignation-reminder`);
      swalMessage.success(`Reminder email sent to ${fullName}.`);
    } catch (err) {
      console.error(err);
      swalMessage.error(err.response?.data?.message || "Failed to send reminder.");
    } finally {
      setSendingId(null);
    }
  };

  const columns = [
    {
      title: "Photo",
      dataIndex: "Photo",
      key: "Photo",
      width: 60,
      render: (photo) => (
        <Avatar
          src={photo ? `data:image/jpeg;base64,${photo}` : null}
          icon={!photo && <UserOutlined />}
        />
      ),
    },
    {
      title: "Full Name",
      dataIndex: "FullName",
      key: "FullName",
    },
    {
      title: "Position",
      dataIndex: "Position",
      key: "Position",
    },
    {
      title: "Email",
      dataIndex: "Email",
      key: "Email",
    },
    {
      title: "Resigned Date",
      dataIndex: "resignedAt",
      key: "resignedAt",
      render: (val) => (val ? dayjs(val).format("MMM D, YYYY") : "—"),
    },
    {
      title: "Scheduled Deletion",
      dataIndex: "scheduledDeletion",
      key: "scheduledDeletion",
      render: (val) => (val ? dayjs(val).format("MMM D, YYYY") : "—"),
    },
    {
      title: "Days Remaining",
      dataIndex: "daysRemaining",
      key: "daysRemaining",
      render: (val) => {
        if (val == null) return "—";
        const color = val <= 7 ? "red" : val <= 14 ? "orange" : "green";
        return <Tag color={color}>{val} day{val !== 1 ? "s" : ""}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<MailOutlined />}
          loading={sendingId === record._id}
          onClick={() => handleSendReminder(record._id, record.FullName)}
        >
          Send Reminder
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="resigned-loading">
        <Spin tip="Loading resigned employees..." />
      </div>
    );
  }

  return (
    <div className="resigned-container">
      <Title level={3} className="resigned-title">
        Resigned Employees
      </Title>

      {resigned.length === 0 ? (
        <div className="resigned-empty">No resigned employees found.</div>
      ) : (
        <Table
          columns={columns}
          dataSource={resigned}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      )}
    </div>
  );
};

export default ResignedEmployees;
