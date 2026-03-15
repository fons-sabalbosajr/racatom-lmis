import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Upload, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "../../utils/axios";
import { swalMessage } from "../../utils/swal";

const { TextArea } = Input;

function RouteLoanModal({ open, onClose, onSent }) {
  const [form] = Form.useForm();
  const [staffUsers, setStaffUsers] = useState([]);
  const [loanApps, setLoanApps] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [sending, setSending] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStaff();
      fetchLoanApps();
      form.resetFields();
      setFileList([]);
    }
  }, [open, form]);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/messages/staff-users");
      setStaffUsers(res.data.users || []);
    } catch {}
  };

  const fetchLoanApps = async () => {
    setSearchLoading(true);
    try {
      const res = await api.get("/loan_clients_application", {
        params: { limit: 100 },
      });
      setLoanApps(res.data.applications || res.data.data || []);
    } catch {}
    setSearchLoading(false);
  };

  const handleRoute = async (values) => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("subject", values.subject || "Loan Application Routed");
      formData.append("body", values.body || "A loan application has been routed for your review.");
      formData.append("loanApplicationId", values.loanApplicationId);
      if (values.priority) formData.append("priority", values.priority);

      const recipients = Array.isArray(values.recipients) ? values.recipients : [values.recipients];
      recipients.forEach((r) => formData.append("recipients", r));

      fileList.forEach((f) => {
        formData.append("file", f.originFileObj || f);
      });

      await api.post("/messages/route-loan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      swalMessage.success("Loan application routed successfully.");
      onSent();
    } catch (err) {
      swalMessage.error(err.response?.data?.message || "Failed to route loan application.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title="Route Loan Application"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleRoute}>
        <Form.Item
          label="Loan Application"
          name="loanApplicationId"
          rules={[{ required: true, message: "Select a loan application" }]}
        >
          <Select
            showSearch
            placeholder="Search loan application..."
            optionFilterProp="label"
            loading={searchLoading}
            options={loanApps.map((app) => ({
              value: app._id,
              label: `${app.AccountId || "—"} — ${[app.FirstName, app.LastName].filter(Boolean).join(" ")} (₱${(app.LoanAmount || 0).toLocaleString()})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Route To"
          name="recipients"
          rules={[{ required: true, message: "Select at least one recipient" }]}
        >
          <Select
            mode="multiple"
            placeholder="Select manager/boss"
            optionFilterProp="label"
            options={staffUsers.map((u) => ({
              value: u._id,
              label: `${u.FullName || u.Username} (${u.Position || "Staff"})`,
            }))}
          />
        </Form.Item>

        <Form.Item label="Subject" name="subject">
          <Input placeholder="Loan Application Routed" />
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

        <Form.Item label="Notes" name="body">
          <TextArea rows={4} placeholder="Add notes or remarks..." />
        </Form.Item>

        <Form.Item label="Attach Supporting Files">
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
              Route Application
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}

export default RouteLoanModal;
