
import React, { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, DatePicker, Select, Button, message, Row, Col } from "antd"; // Added Row, Col
import api from "../../../utils/axios";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const AddCollectionModal = ({
  visible,
  onCancel,
  onSuccess,
  loanCycleNo,
  accountId,
  clientNo,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState([]); // New state
  const [paymentModes, setPaymentModes] = useState([]); // New state

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        LoanCycleNo: loanCycleNo,
        PaymentDate: dayjs(), // Default to today's date
      });

      // Fetch collectors
      api.get("/loan-collections/collector-names")
        .then((res) => {
          if (res.data.success) {
            setCollectors(res.data.data);
          } else {
            message.error("Failed to fetch collector names.");
          }
        })
        .catch((err) => {
          console.error("Error fetching collector names:", err);
          message.error("Error fetching collector names.");
        });

      // Fetch payment modes
      api.get("/loan-collections/payment-modes")
        .then((res) => {
          if (res.data.success) {
            setPaymentModes(res.data.data);
          } else {
            message.error("Failed to fetch payment modes.");
          }
        })
        .catch((err) => {
          console.error("Error fetching payment modes:", err);
          message.error("Error fetching payment modes.");
        });
    }
  }, [visible, loanCycleNo, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        PaymentDate: values.PaymentDate ? values.PaymentDate.toISOString() : null,
        DateReceived: values.DateReceived ? values.DateReceived.toISOString() : null,
        DateProcessed: values.DateProcessed ? values.DateProcessed.toISOString() : null,
        // Convert Decimal128 fields to string if they are numbers
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

      const res = await api.post("/loan-collections", payload);

      if (res.data.success) {
        message.success("Collection added successfully!");
        onSuccess();
        onCancel();
      } else {
        message.error(res.data.message || "Failed to add collection.");
      }
    } catch (error) {
      console.error("Error adding collection:", error);
      message.error("Error adding collection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add New Collection"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={900} // Changed width to 900
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}> {/* Added Row for 3 columns */}
          <Col span={8}>
            <Form.Item label="Loan Cycle No." name="LoanCycleNo" rules={[{ required: true }]}>
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Payment Date" name="PaymentDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Collector Name" name="CollectorName" rules={[{ required: true }]}>
              <Select placeholder="Select Collector">
                {collectors.map((collector) => (
                  <Option key={collector} value={collector}>{collector}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Payment Mode" name="PaymentMode" rules={[{ required: true }]}>
              <Select placeholder="Select Payment Mode">
                {paymentModes.map((mode) => (
                  <Option key={mode} value={mode}>{mode}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Collection Reference No." name="CollectionReferenceNo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bank" name="Bank">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Branch" name="Branch">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Amortization" name="Amortization">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Amortization Principal" name="AmortizationPrincipal">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Amortization Interest" name="AmortizationInterest">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Principal Due" name="PrincipalDue">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Principal Paid" name="PrincipalPaid">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Principal Balance" name="PrincipalBalance">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Collected Interest" name="CollectedInterest">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Interest Paid" name="InterestPaid">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Total Collected" name="TotalCollected">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Actual Collection" name="ActualCollection">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Collection Payment" name="CollectionPayment">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Running Balance" name="RunningBalance">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Total Loan To Pay" name="TotalLoanToPay">
              <InputNumber style={{ width: "100%" }} parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Date Received" name="DateReceived">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Date Processed" name="DateProcessed">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={16}> {/* Remarks takes 2 columns */}
            <Form.Item label="Remarks" name="Remarks">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default AddCollectionModal;