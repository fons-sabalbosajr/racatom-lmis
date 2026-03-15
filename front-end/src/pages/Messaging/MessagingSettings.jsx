import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Switch, InputNumber, Button, Space, Divider, Typography } from "antd";
import api from "../../utils/axios";
import { swalMessage } from "../../utils/swal";

const { TextArea } = Input;
const { Text } = Typography;

function MessagingSettings({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchSettings();
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/messages/settings");
      const s = res.data.settings || {};
      form.setFieldsValue({
        emailNotifications: s.emailNotifications ?? true,
        signature: s.signature || "",
        autoArchiveDays: s.autoArchiveDays || 0,
      });
    } catch {
      swalMessage.error("Failed to load settings.");
    }
    setLoading(false);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await api.put("/messages/settings", values);
      swalMessage.success("Settings saved.");
      onClose();
    } catch {
      swalMessage.error("Failed to save settings.");
    }
    setSaving(false);
  };

  return (
    <Modal
      title="Messaging Settings"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item label="Email Notifications" name="emailNotifications" valuePropName="checked">
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>

        <Form.Item
          label="Email Signature"
          name="signature"
          extra="This signature is appended to your outgoing messages."
        >
          <TextArea rows={3} placeholder="Your signature..." />
        </Form.Item>

        <Form.Item
          label="Auto-Archive After (days)"
          name="autoArchiveDays"
          extra="Set to 0 to disable. Read messages older than this many days will be auto-archived."
        >
          <InputNumber min={0} max={365} style={{ width: 120 }} />
        </Form.Item>

        <Divider />

        <div style={{ textAlign: "right" }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Settings
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}

export default MessagingSettings;
