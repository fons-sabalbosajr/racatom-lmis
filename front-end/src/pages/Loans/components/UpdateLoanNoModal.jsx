import React, { useState, useEffect } from "react";
import { Modal, Button, Table, Input, Form, Typography, message } from "antd";
const { TextArea } = Input;
import api from "../../../utils/axios";

const { Text } = Typography;

export default function UpdateLoanNoModal({
  visible,
  onCancel,
  loansToUpdate,
  onLoanUpdated,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editableData, setEditableData] = useState([]);

  useEffect(() => {
    if (visible && loansToUpdate) {
      setEditableData(loansToUpdate.map(loan => ({
        ...loan,
        editableLoanNo: loan.loanInfo?.loanNo || "",
      })));
    }
  }, [visible, loansToUpdate]);

  const handleSave = async (record) => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const newLoanNo = values[`loanNo_${record._id}`];

      if (!newLoanNo || newLoanNo.includes("-R")) {
        message.error("Loan No. cannot be empty or contain '-R'");
        return;
      }

      // Call API to update the loan
      const res = await api.put(`/loans/${record._id}`, {
        LoanCycleNo: newLoanNo,
      });

      if (res.data.success) {
        message.success(`Loan No. for ${record.accountId} updated successfully!`);
        onLoanUpdated(); // Notify parent to refresh data
      } else {
        message.error("Failed to update Loan No.");
      }
    } catch (error) {
      console.error("Error updating loan number:", error);
      message.error("Error updating Loan No.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Account ID",
      dataIndex: "accountId",
      key: "accountId",
    },
    {
      title: "Client No",
      dataIndex: "clientNo",
      key: "clientNo",
    },
    {
      title: "Current Loan No.",
      dataIndex: ["loanInfo", "loanNo"],
      key: "currentLoanNo",
      render: (text) => <Text type="danger">{text}</Text>,
    },
    {
      title: "New Loan No.",
      dataIndex: "editableLoanNo",
      key: "editableLoanNo",
      width: "30%",
      render: (_, record) => (
        <Form.Item
          name={`loanNo_${record._id}`}
          initialValue={record.editableLoanNo}
          rules={[{ required: true, message: "Please enter new Loan No." }]} // Add validation
        >
          <TextArea
            autoSize={{ minRows: 1, maxRows: 6 }}
            onChange={(e) => {
              const newData = editableData.map(item => {
                if (item._id === record._id) {
                  return { ...item, editableLoanNo: e.target.value };
                }
                return item;
              });
              setEditableData(newData);
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => handleSave(record)}
          loading={loading}
          disabled={loading}
        >
          Save
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="Update Loan Numbers"
      open={visible}
      onCancel={onCancel}
      footer={null} // Custom footer with save buttons per row
      width={1200}
    >
      <Form form={form} component={false}>
        <Table
          dataSource={editableData}
          columns={columns}
          rowKey="_id"
          pagination={false}
          loading={loading}
          scroll={{ y: 400 }}
        />
      </Form>
    </Modal>
  );
}
