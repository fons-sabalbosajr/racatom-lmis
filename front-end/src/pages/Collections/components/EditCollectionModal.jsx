import React, { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, DatePicker, Select, Button, message } from "antd";
import api from "../../../utils/axios";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const EditCollectionModal = ({
  visible,
  onCancel,
  onSuccess,
  collectionData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && collectionData) {
      form.setFieldsValue({
        ...collectionData,
        PaymentDate: collectionData.PaymentDate ? dayjs(collectionData.PaymentDate) : null,
        DateReceived: collectionData.DateReceived ? dayjs(collectionData.DateReceived) : null,
        DateProcessed: collectionData.DateProcessed ? dayjs(collectionData.DateProcessed) : null,
        // Convert Decimal128 fields to numbers for form display
        Amortization: parseFloat(collectionData.Amortization),
        AmortizationPrincipal: parseFloat(collectionData.AmortizationPrincipal),
        AmortizationInterest: parseFloat(collectionData.AmortizationInterest),
        PrincipalDue: parseFloat(collectionData.PrincipalDue),
        PrincipalPaid: parseFloat(collectionData.PrincipalPaid),
        PrincipalBalance: parseFloat(collectionData.PrincipalBalance),
        CollectedInterest: parseFloat(collectionData.CollectedInterest),
        InterestPaid: parseFloat(collectionData.InterestPaid),
        TotalCollected: parseFloat(collectionData.TotalCollected),
        ActualCollection: parseFloat(collectionData.ActualCollection),
        CollectionPayment: parseFloat(collectionData.CollectionPayment),
        RunningBalance: parseFloat(collectionData.RunningBalance),
        TotalLoanToPay: parseFloat(collectionData.TotalLoanToPay),
      });
    }
  }, [visible, collectionData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        PaymentDate: values.PaymentDate ? values.PaymentDate.toISOString() : null,
        DateReceived: values.DateReceived ? values.DateReceived.toISOString() : null,
        DateProcessed: values.DateProcessed ? values.DateProcessed.toISOString() : null,
        // Convert numbers back to string for Decimal128 fields
        Amortization: values.Amortization ? String(values.Amortization) : "0.0",
        AmortizationPrincipal: values.AmortizationPrincipal ? String(values.AmortizationPrincipal) : "0.0",
        AmortizationInterest: values.AmortizationInterest ? String(values.AmortizationInterest) : "0.0",
        PrincipalDue: values.PrincipalDue ? String(values.PrincipalDue) : "0.0",
        PrincipalPaid: values.PrincipalPaid ? String(values.PrincipalPaid) : "0.0",
        PrincipalBalance: values.PrincipalBalance ? String(values.PrincipalBalance) : "0.0",
        CollectedInterest: values.CollectedInterest ? String(values.CollectedInterest) : "0.0",
        InterestPaid: values.InterestPaid ? String(values.InterestPaid) : "0.0",
        TotalCollected: values.TotalCollected ? String(values.TotalCollected) : "0.0",
        ActualCollection: values.ActualCollection ? String(values.ActualCollection) : "0.0",
        CollectionPayment: values.CollectionPayment ? String(values.CollectionPayment) : "0.0",
        RunningBalance: values.RunningBalance ? String(values.RunningBalance) : "0.0",
        TotalLoanToPay: values.TotalLoanToPay ? String(values.TotalLoanToPay) : "0.0",
      };

      const res = await api.put(`/loan-collections/${collectionData._id}`, payload);

      if (res.data.success) {
        message.success("Collection updated successfully!");
        onSuccess();
        onCancel();
      } else {
        message.error(res.data.message || "Failed to update collection.");
      }
    } catch (error) {
      console.error("Error updating collection:", error);
      message.error("Error updating collection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Collection"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Loan Cycle No." name="LoanCycleNo" rules={[{ required: true }]}>
          <Input disabled />
        </Form.Item>
        <Form.Item label="Payment Date" name="PaymentDate" rules={[{ required: true }]}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        {/* Removed Collector Name and Payment Mode Selects */}
        <Form.Item label="Collection Reference No." name="CollectionReferenceNo">
          <Input />
        </Form.Item>
        <Form.Item label="Bank" name="Bank">
          <Input />
        </Form.Item>
        <Form.Item label="Branch" name="Branch">
          <Input />
        </Form.Item>
        <Form.Item label="Amortization" name="Amortization">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Amortization Principal" name="AmortizationPrincipal">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Amortization Interest" name="AmortizationInterest">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Principal Due" name="PrincipalDue">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Principal Paid" name="PrincipalPaid">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Principal Balance" name="PrincipalBalance">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Collected Interest" name="CollectedInterest">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Interest Paid" name="InterestPaid">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Total Collected" name="TotalCollected">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Actual Collection" name="ActualCollection">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Collection Payment" name="CollectionPayment">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Running Balance" name="RunningBalance">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Total Loan To Pay" name="TotalLoanToPay">
          <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
            formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
        </Form.Item>
        <Form.Item label="Date Received" name="DateReceived">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Date Processed" name="DateProcessed">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditCollectionModal;