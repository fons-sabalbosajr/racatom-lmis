
import React, { useState, useEffect } from "react";
import { Modal, Form, Select, Button, message } from "antd";
import axios from "../../../utils/axios";

const { Option } = Select;

const UpdateStatusSummaryModal = ({ visible, loan, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loanStatuses, setLoanStatuses] = useState([]);
  const [processStatuses, setProcessStatuses] = useState([]);

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
          <Select placeholder="Select a status">
            {loanStatuses.map((status) => (
              <Option key={status} value={status}>
                {status}
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
          <Select placeholder="Select a status">
            {processStatuses.map((status) => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateStatusSummaryModal;
