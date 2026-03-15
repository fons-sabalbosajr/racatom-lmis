import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Upload, Tag, Space } from "antd";
import { UploadOutlined, PaperClipOutlined } from "@ant-design/icons";
import api from "../../utils/axios";
import { swalMessage } from "../../utils/swal";

const { TextArea } = Input;

function ComposeModal({ open, onClose, onSent, replyTo }) {
  const [form] = Form.useForm();
  const [staffUsers, setStaffUsers] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStaff();
      if (replyTo) {
        form.setFieldsValue({
          recipients: [replyTo.sender?._id],
          subject: `Re: ${replyTo.subject || "(No Subject)"}`,
        });
      } else {
        form.resetFields();
      }
      setFileList([]);
    }
  }, [open, replyTo, form]);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/messages/staff-users");
      setStaffUsers(res.data.users || []);
    } catch {}
  };

  const handleSend = async (values) => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("subject", values.subject || "(No Subject)");
      formData.append("body", values.body);
      if (replyTo) formData.append("parentMessage", replyTo._id);
      if (values.priority) formData.append("priority", values.priority);

      // Handle recipients array
      const recipients = Array.isArray(values.recipients) ? values.recipients : [values.recipients];
      recipients.forEach((r) => formData.append("recipients", r));

      // Attach files
      fileList.forEach((f) => {
        formData.append("file", f.originFileObj || f);
      });

      await api.post("/messages/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      swalMessage.success("Message sent.");
      onSent();
    } catch (err) {
      swalMessage.error(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={replyTo ? "Reply" : "Compose Message"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSend}>
        <Form.Item
          label="To"
          name="recipients"
          rules={[{ required: true, message: "Select at least one recipient" }]}
        >
          <Select
            mode="multiple"
            placeholder="Select recipients"
            optionFilterProp="label"
            className="compose-recipients-select"
            options={staffUsers.map((u) => ({
              value: u._id,
              label: `${u.FullName || u.Username} (${u.Position || "Staff"})`,
            }))}
          />
        </Form.Item>

        <Form.Item label="Subject" name="subject">
          <Input placeholder="Subject" />
        </Form.Item>

        <Form.Item label="Priority" name="priority" initialValue="normal">
          <Select
            options={[
              { value: "normal", label: "Normal" },
              { value: "urgent", label: "Urgent" },
              { value: "low", label: "Low" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Message"
          name="body"
          rules={[{ required: true, message: "Enter a message" }]}
        >
          <TextArea rows={6} placeholder="Write your message..." />
        </Form.Item>

        <Form.Item label="Attachments">
          <Upload
            multiple
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
          >
            <Button icon={<UploadOutlined />}>Attach Files</Button>
          </Upload>
        </Form.Item>

        <div style={{ textAlign: "right" }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={sending}>
              Send
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}

export default ComposeModal;
