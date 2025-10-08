
import React, { useState, useEffect } from "react";
import { Modal, Form, Select, Button, message, Tag, Typography } from "antd";
import axios from "../../../utils/axios";

const { Option } = Select;

const UpdateStatusSummaryModal = ({ visible, loan, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loanStatuses, setLoanStatuses] = useState([]);
  const [processStatuses, setProcessStatuses] = useState([]);

  // Color maps copied from LoanColumns.jsx for visual consistency
  const LOAN_STATUS_COLORS = {
    UPDATED: "green",
    ARREARS: "orange",
    "PAST DUE": "red",
    LITIGATION: "volcano",
    DORMANT: "gray",
    CLOSED: "default",
  };

  const LOAN_PROCESS_STATUS_COLORS = {
    Updated: "green",
    Approved: "blue",
    Pending: "gold",
    Released: "purple",
    "Loan Released": "purple",
  };

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        status: loan?.loanInfo?.status,
        processStatus: loan?.loanInfo?.processStatus,
      });
    }
    // Fetch statuses
    axios.get("/loans/statuses").then((res) => {
        setLoanStatuses(res.data.data);
    });
    // Hardcoding process statuses as there is no endpoint for it
    setProcessStatuses(["Pending", "Approved", "Released", "Updated", "Loan Released"]);


  }, [visible, loan, form]);

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await axios.put(`/loans/${loan._id}`, {
        loanInfo: {
          status: values.status,
          processStatus: values.processStatus,
        },
      });
      message.success("Loan status updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      message.error("Failed to update loan status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Update Status Summary"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleUpdate}
        >
          Update
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" name="update_status_form">
        <Form.Item
          name="status"
          label="Loan Status"
          rules={[{ required: true, message: "Please select a loan status!" }]}
        >
          <Select placeholder="Select a status" optionLabelProp="label">
            {loanStatuses.map((status) => (
              <Option
                key={status}
                value={status}
                label={status}
              >
                <Tag color={LOAN_STATUS_COLORS[status] || "default"}>{status}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="processStatus"
          label="Process Status"
          rules={[
            { required: true, message: "Please select a process status!" },
          ]}
        >
          <Select placeholder="Select a status" optionLabelProp="label">
            {processStatuses.map((status) => (
              <Option
                key={status}
                value={status}
                label={status}
              >
                <Tag color={LOAN_PROCESS_STATUS_COLORS[status] || "default"}>{status}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Preview of selected values with colors */}
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">Current selection:</Typography.Text>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.getFieldValue('status') && (
              <Tag color={LOAN_STATUS_COLORS[form.getFieldValue('status')] || 'default'}>
                {form.getFieldValue('status')}
              </Tag>
            )}
            {form.getFieldValue('processStatus') && (
              <Tag color={LOAN_PROCESS_STATUS_COLORS[form.getFieldValue('processStatus')] || 'default'}>
                {form.getFieldValue('processStatus')}
              </Tag>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default UpdateStatusSummaryModal;
