import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  message,
  Row,
  Col,
  Card,
  Radio,
  Tooltip,
  Collapse,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";

const { Option } = Select;
const { Panel } = Collapse;

const AddCollectionModal = ({ visible, onCancel, onSuccess, loan }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [paymentVia, setPaymentVia] = useState("Cash");
  //console.log("LOAN OBJECT:", JSON.stringify(loan, null, 2));
  const [collectionRefNo, setCollectionRefNo] = useState("");
  const [onlinePlatform, setOnlinePlatform] = useState("");
  const [bankName, setBankName] = useState("");

  const generateCollectionRefNo = (loanCycleNo) => {
    if (!loanCycleNo) return "";
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `${loanCycleNo}-${randomDigits}`;
  };

  useEffect(() => {
    if (visible && loan) {
      const refNo = generateCollectionRefNo(loan.loanInfo?.loanNo);
      setCollectionRefNo(refNo);
      form.resetFields();
      setPaymentVia("Cash");
      setOnlinePlatform("");
      setBankName("");
      form.setFieldsValue({
        CollectionReferenceNo: refNo,
        DateReceived: dayjs(),
        DateProcessed: dayjs(),
        LoanCycleNo: loan.loanInfo?.loanNo,
        LoanAmount: loan.loanInfo?.amount,
        LoanTerm: loan.loanInfo?.term,
        PaymentMode: loan.loanInfo?.paymentMode,
        AmortizationPrincipal: loan.loanInfo?.amortizationPrincipal,
        AmortizationInterest: loan.loanInfo?.amortizationInterest,
        LoanToBePaid: loan.loanInfo?.totalLoanToPay,
        LoanAmountCollected: loan.loanInfo?.totalCollected,
        RemainingBalance: loan.loanInfo?.runningBalance,
      });

      api
        .get("/collectors")
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
    }
  }, [visible, loan, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const decimalFields = [
        'Amortization', 'AmortizationPrincipal', 'AmortizationInterest',
        'PrincipalDue', 'PrincipalPaid', 'PrincipalBalance',
        'CollectedInterest', 'InterestPaid', 'TotalCollected',
        'ActualCollection', 'CollectionPayment', 'RunningBalance', 'TotalLoanToPay'
      ];

      const payload = { ...values };
      decimalFields.forEach(field => {
        if (payload[field] != null) {
          payload[field] = String(payload[field]);
        } else {
          payload[field] = '0.0';
        }
      });

      // Handle date conversions and mapping
      if (payload.DateReceived) {
        payload.PaymentDate = payload.DateReceived.toISOString();
        payload.DateReceived = payload.DateReceived.toISOString();
      }
      if (payload.DateProcessed) {
        payload.DateProcessed = payload.DateProcessed.toISOString();
      }

      // Explicitly add all required fields to ensure they are present
      payload.AccountId = loan.accountId;
      payload.ClientNo = loan.clientNo; // Corrected mapping from loan prop
      payload.LoanCycleNo = loan.loanInfo?.loanNo;

      const res = await api.post("/loan-collections", payload);

      if (res.data.success) {
        message.success("Collection added successfully!");
        onSuccess();
        onCancel();
      } else {
        message.error(res.data.message || "Failed to add collection.");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
      console.error("Error adding collection:", errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const paymentsTitle = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>Payments</span>
      <span style={{ fontSize: "12px", color: "#888" }}>
        Ref No: {collectionRefNo}
      </span>
    </div>
  );

  return (
    <Modal
      title="Add New Collection"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="CollectionReferenceNo" hidden>
            <Input />
        </Form.Item>
        <Card title={paymentsTitle} size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label={
                  <span>
                    Enter Collection Payment{" "}
                    <Tooltip title="Information about collection payment.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name="CollectionPayment"
                rules={[{ required: true }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                  formatter={(value) =>
                    `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  size="small"
                />
              </Form.Item>
              <Form.Item name="PaymentType" initialValue="Regular Payment">
                <Radio.Group size="small">
                  <Radio value="Regular Payment">Regular Payment</Radio>
                  <Radio value="Advance Payment">Advance Payment</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment via"
                name="PaymentVia"
                initialValue="Cash"
              >
                <Select size="small" onChange={setPaymentVia}>
                  <Option value="Cash">Cash</Option>
                  <Option value="Online Payment">Online Payment</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option>
                </Select>
              </Form.Item>
            </Col>
            {paymentVia === "Online Payment" && (
              <Col span={12}>
                <Form.Item label="Platform" name="OnlinePlatform">
                  <Select
                    size="small"
                    placeholder="Select Platform"
                    onChange={setOnlinePlatform}
                  >
                    <Option value="Gcash">Gcash</Option>
                    <Option value="Paymaya">Paymaya</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
            {paymentVia === "Bank Transfer" && (
              <Col span={12}>
                <Form.Item label="Bank" name="BankName">
                  <Select
                    size="small"
                    placeholder="Select Bank"
                    onChange={setBankName}
                  >
                    <Option value="Landbank">Landbank</Option>
                    <Option value="BDO">BDO</Option>
                    <Option value="Eastwest">Eastwest</Option>
                    <Option value="ChinaBank">ChinaBank</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>
          {onlinePlatform === "Other" && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="E-Wallet Name" name="OtherOnlinePlatform">
                  <Input size="small" style={{ height: "28px" }} placeholder="Enter E-Wallet Name" />
                </Form.Item>
              </Col>
            </Row>
          )}
          {bankName === "Other" && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Bank Name" name="OtherBankName">
                   <Input size="small" style={{ height: "28px" }} placeholder="Enter Bank Name"/>
                </Form.Item>
              </Col>
            </Row>
          )}
          {paymentVia === "Online Payment" && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Reference No."
                  name="OnlineRefNo"
                  rules={[{ required: true }]}
                >
                  <Input size="small" style={{ height: "28px" }} />
                </Form.Item>
              </Col>
            </Row>
          )}
          {paymentVia === "Bank Transfer" && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Reference No."
                  name="BankRefNo"
                  rules={[{ required: true }]}
                >
                  <Input size="small" style={{ height: "28px" }} />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Collector Name"
                name="CollectorName"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select Collector" size="small">
                  {collectors.map((collector) => (
                    <Option key={collector._id} value={collector.Name}>
                      {collector.Name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date Received" name="DateReceived">
                <DatePicker style={{ width: "100%" }} size="small" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date Processed" name="DateProcessed">
                <DatePicker style={{ width: "100%" }} size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Remarks" name="Remarks">
                <Input.TextArea rows={1} size="small" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Collapse size="small" style={{ marginBottom: 16 }}>
          <Panel header="Loan Details Summary" key="1">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Loan Cycle No." name="LoanCycleNo">
                  <Input size="small" disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Loan Amount" name="LoanAmount">
                  <InputNumber
                    size="small"
                    style={{ width: "100%" }}
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Loan Term" name="LoanTerm">
                  <Input size="small" disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Payment Mode" name="PaymentMode">
                  <Input size="small" disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Amortization (Principal)"
                  name="AmortizationPrincipal"
                >
                  <InputNumber
                    size="small"
                    style={{ width: "100%" }}
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Amortization (Interest)"
                  name="AmortizationInterest"
                >
                  <InputNumber
                    size="small"
                    style={{ width: "100%" }}
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>
        </Collapse>

        <Collapse size="small">
          <Panel header="Collection Summary" key="2">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Loan to be Paid" name="LoanToBePaid">
                  <InputNumber
                    size="small"
                    style={{ width: "100%" }}
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Loan Amount Collected"
                  name="LoanAmountCollected"
                >
                  <InputNumber
                    size="small"
                    style={{ width: "100%" }}
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Remaining Balance" name="RemainingBalance">
                  <InputNumber
                    size="small"
                    style={{ width: "100%" }}
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};

export default AddCollectionModal;
