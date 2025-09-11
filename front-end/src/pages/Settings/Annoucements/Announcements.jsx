import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Popconfirm,
  Modal,
  Form,
  Input,
  message,
  Switch,
  DatePicker,
} from "antd";
import moment from "moment";
import api from "../../../utils/axios";
import "./announcements.css";

const { TextArea } = Input;

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [form] = Form.useForm();

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/announcements");
      setAnnouncements(data.announcements);
    } catch (err) {
      console.error(err);
      message.error("Failed to load announcements");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openModal = (announcement = null) => {
    setEditingAnnouncement(announcement);
    if (announcement) {
      form.setFieldsValue({
        Title: announcement.Title,
        Content: announcement.Content,
        isActive: announcement.isActive,
        ExpirationDate: announcement.ExpirationDate
          ? moment(announcement.ExpirationDate)
          : null,
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      values.ExpirationDate = values.ExpirationDate
        ? values.ExpirationDate.toISOString()
        : null;

      if (editingAnnouncement) {
        await api.put(`/announcements/${editingAnnouncement._id}`, values);
        message.success("Announcement updated");
      } else {
        await api.post("/announcements", values);
        message.success("Announcement added");
      }
      setIsModalOpen(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      message.error("Failed to save announcement");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      message.success("Announcement deleted");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete announcement");
    }
  };

  // Toggle isActive from table switch
  const handleToggleActive = async (record) => {
    try {
      await api.put(`/announcements/${record._id}`, {
        isActive: !record.isActive,
      });
      message.success(
        `Announcement "${record.Title}" is now ${
          !record.isActive ? "Active" : "Inactive"
        }`
      );
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      message.error("Failed to update display status");
    }
  };

  const columns = [
    {
      title: "Announcement",
      key: "info",
      width: "60%",
      render: (_, record) => {
        const postedDate = moment(record.PostedDate);
        const oneYearAgo = moment().subtract(1, "years");
        const showWarning = postedDate.isBefore(oneYearAgo);

        return (
          <div className="announcement-info">
            <div className="announcement-title">{record.Title}</div>
            <div className="announcement-content">{record.Content}</div>
            <div className="announcement-date">
              Posted: {postedDate.format("MMM DD, YYYY hh:mm A")}
            </div>
            {showWarning && (
              <div className="announcement-warning">
                ⚠ This announcement is over 1 year old and will be deleted in 7
                days
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Display on Bulletin",
      dataIndex: "isActive",
      key: "isActive",
      render: (_, record) => (
        <Switch
          checked={record.isActive}
          onChange={() => handleToggleActive(record)}
        />
      ),
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: "Expiration Date",
      dataIndex: "ExpirationDate",
      key: "expiration",
      render: (val) => (val ? moment(val).format("MMM DD, YYYY") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          <Button
            size="small"
            style={{ marginRight: 8 }}
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this announcement?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div className="announcement-container">
      <h2>Announcements</h2>

      <div className="announcement-actions">
        <Button type="primary" onClick={() => openModal()}>
          Add Announcement
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={announcements}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 6 }}
        rowClassName={(record) =>
          record.isActive ? "" : "inactive-announcement"
        }
      />

      <Modal
        title={editingAnnouncement ? "Edit Announcement" : "Add Announcement"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="Title"
            label="Title"
            rules={[{ required: true, message: "Please input the title" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="Content"
            label="Content"
            rules={[{ required: true, message: "Please input the content" }]}
          >
            <TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Display on Bulletin"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="ExpirationDate" label="Expiration Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Announcements;
