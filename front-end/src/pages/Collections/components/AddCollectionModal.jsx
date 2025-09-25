import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
  Tooltip,
  Card,
} from "antd"; // Added Row, Col, Switch, Tooltip
import { InfoCircleOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const AddCollectionModal = ({
  visible,
  onCancel,
  onSuccess,
  loan,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState([]); // New state
  const [paymentModes, setPaymentModes] = useState([]); // New state
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false); // New state for automate toggle
  const [loanRatesConfig, setLoanRatesConfig] = useState([]); // New state for loan rates configuration

  useEffect(() => {
    if (visible && loan) {
      form.resetFields();
      form.setFieldsValue({
        LoanCycleNo: loan.loanInfo?.loanNo,
        PaymentDate: dayjs(), // Default to today's date
        LoanAmount: loan.loanInfo?.amount,
        LoanTerm: parseInt(loan.loanInfo?.term),
        PaymentMode: loan.loanInfo?.paymentMode,
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

      // Fetch loan rates configuration
      api.get("/loan_rates")
        .then((res) => {
          setLoanRatesConfig(res.data);
          // Extract unique payment modes from loan rates configuration
          const uniqueModes = [...new Set(res.data.map(rate => rate.Mode))];
          setPaymentModes(uniqueModes);
        })
        .catch((err) => {
          console.error("Error fetching loan rates configuration:", err);
          message.error("Error fetching loan rates configuration.");
        });
    }
  }, [visible, loan, form, loanRatesConfig]);

  useEffect(() => {
    if (isAutomateEnabled) {
      message.info("Automation enabled. Amortization, Principal, and Interest details will be auto-computed.");
    } else {
      message.info("Automation disabled. Please enter Amortization, Principal, and Interest details manually.");
    }
  }, [isAutomateEnabled]);

  const calculateAmortization = useCallback(
    (loanAmount, loanTerm, paymentMode, loanRates) => {
      const matchedRate = loanRates.find(
        (rate) =>
          rate.Principal === loanAmount &&
          rate.Term === loanTerm &&
          rate.Mode === paymentMode
      );

      if (!matchedRate) {
        message.warning(
          "No matching loan rate found for the given Loan Amount, Term, and Payment Mode."
        );
        return null;
      }

      const principal = parseFloat(loanAmount);
      const term = parseInt(loanTerm);
      const monthlyInterestRate =
        parseFloat(matchedRate["Interest Rate/Month"]) / 100;

      let amortization;
      if (monthlyInterestRate === 0) {
        amortization = principal / term;
      } else {
        amortization =
          (principal *
            (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, term))) /
          (Math.pow(1 + monthlyInterestRate, term) - 1);
      }

      const totalLoanToPay = amortization * term;
      const totalInterest = totalLoanToPay - principal;

      // For simplicity, distributing principal and interest evenly across amortization
      const amortizationPrincipal = principal / term;
      const amortizationInterest = totalInterest / term;

      return {
        Amortization: parseFloat(amortization.toFixed(2)),
        AmortizationPrincipal: parseFloat(amortizationPrincipal.toFixed(2)),
        AmortizationInterest: parseFloat(amortizationInterest.toFixed(2)),
        PrincipalDue: parseFloat(principal.toFixed(2)),
        PrincipalPaid: 0, // Initial state
        PrincipalBalance: parseFloat(principal.toFixed(2)), // Initial state
        CollectedInterest: 0, // Initial state
        InterestPaid: 0, // Initial state
        TotalCollected: 0, // Initial state
        ActualCollection: 0, // Initial state
        CollectionPayment: 0, // Initial state
        RunningBalance: parseFloat(principal.toFixed(2)), // Initial state
        TotalLoanToPay: parseFloat(totalLoanToPay.toFixed(2)),
      };
    },
    []
  );

  useEffect(() => {
    if (isAutomateEnabled) {
      const loanAmount = form.getFieldValue("LoanAmount");
      const loanTerm = form.getFieldValue("LoanTerm");
      const paymentMode = form.getFieldValue("PaymentMode");

      if (loanAmount && loanTerm && paymentMode && loanRatesConfig.length > 0) {
        const calculatedValues = calculateAmortization(
          loanAmount,
          loanTerm,
          paymentMode,
          loanRatesConfig
        );
        if (calculatedValues) {
          form.setFieldsValue(calculatedValues);
        }
      }
    }
  }, [
    isAutomateEnabled,
    form,
    loanRatesConfig,
    calculateAmortization,
    form.getFieldValue("LoanAmount"),
    form.getFieldValue("LoanTerm"),
    form.getFieldValue("PaymentMode"),
  ]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        PaymentDate: values.PaymentDate
          ? values.PaymentDate.toISOString()
          : null,
        DateReceived: values.DateReceived
          ? values.DateReceived.toISOString()
          : null,
        DateProcessed: values.DateProcessed
          ? values.DateProcessed.toISOString()
          : null,
        // Convert Decimal128 fields to string if they are numbers
        Amortization: values.Amortization ? String(values.Amortization) : "0.0",
        AmortizationPrincipal: values.AmortizationPrincipal
          ? String(values.AmortizationPrincipal)
          : "0.0",
        AmortizationInterest: values.AmortizationInterest
          ? String(values.AmortizationInterest)
          : "0.0",
        PrincipalDue: values.PrincipalDue ? String(values.PrincipalDue) : "0.0",
        PrincipalPaid: values.PrincipalPaid
          ? String(values.PrincipalPaid)
          : "0.0",
        PrincipalBalance: values.PrincipalBalance
          ? String(values.PrincipalBalance)
          : "0.0",
        CollectedInterest: values.CollectedInterest
          ? String(values.CollectedInterest)
          : "0.0",
        InterestPaid: values.InterestPaid ? String(values.InterestPaid) : "0.0",
        TotalCollected: values.TotalCollected
          ? String(values.TotalCollected)
          : "0.0",
        ActualCollection: values.ActualCollection
          ? String(values.ActualCollection)
          : "0.0",
        CollectionPayment: values.CollectionPayment
          ? String(values.CollectionPayment)
          : "0.0",
        RunningBalance: values.RunningBalance
          ? String(values.RunningBalance)
          : "0.0",
        TotalLoanToPay: values.TotalLoanToPay
          ? String(values.TotalLoanToPay)
          : "0.0",
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
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Add New Collection</span>
          <div style={{ display: "flex", alignItems: "center", marginRight: 30 }}>
            <Switch
              checked={isAutomateEnabled}
              onChange={setIsAutomateEnabled}
              checkedChildren="Automate On"
              unCheckedChildren="Automate Off"
              style={{ marginRight: 8 }}
            />
            <Tooltip title="Toggle to automatically compute Amortization, Principal, and Interest details based on Loan Amount, Loan Term, and Payment Mode.">
              <InfoCircleOutlined />
            </Tooltip>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={800} // Changed width to 900
    >
      <Form form={form} layout="vertical">
        <Card title="Collection Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Loan Cycle No."
              name="LoanCycleNo"
              rules={[{ required: true }]}
            >
              <Input disabled size="small" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Loan Amount"
              name="LoanAmount"
              rules={[{ required: true, message: "Please input Loan Amount" }]}
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
          </Col>
          <Col span={8}>
            <Form.Item
              label="Loan Term (months)"
              name="LoanTerm"
              rules={[{ required: true, message: "Please input Loan Term" }]}
            >
              <InputNumber style={{ width: "100%" }} size="small" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Payment Date"
              name="PaymentDate"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: "100%" }} size="small" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Collector Name"
              name="CollectorName"
              rules={[{ required: true }]}
            >
              <Select placeholder="Select Collector" size="small">
                {collectors.map((collector) => (
                  <Option key={collector} value={collector}>
                    {collector}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Payment Mode"
              name="PaymentMode"
              rules={[{ required: true }]}
            >
              <Select placeholder="Select Payment Mode" size="small">
                {paymentModes.map((mode) => (
                  <Option key={mode} value={mode}>
                    {mode}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Collection Reference No."
              name="CollectionReferenceNo"
            >
              <Input size="small" />
            </Form.Item>
          </Col>
        </Row>
        </Card>

        <Card title="Bank Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Bank" name="Bank">
              <Input size="small" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Branch" name="Branch">
              <Input size="small" />
            </Form.Item>
          </Col>
        </Row>
        </Card>

        <Card title="Amortization Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Amortization" name="Amortization">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Amortization Principal"
              name="AmortizationPrincipal"
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
          </Col>
          <Col span={8}>
            <Form.Item
              label="Amortization Interest"
              name="AmortizationInterest"
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
          </Col>
        </Row>
        </Card>

        <Card title="Principal Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Principal Due" name="PrincipalDue">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Principal Paid" name="PrincipalPaid">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Principal Balance" name="PrincipalBalance">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
        </Card>

        <Card title="Interest Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Collected Interest" name="CollectedInterest">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Interest Paid" name="InterestPaid">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
        </Card>

        <Card title="Collection Summary" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Total Collected" name="TotalCollected">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Actual Collection" name="ActualCollection">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Collection Payment" name="CollectionPayment">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Running Balance" name="RunningBalance">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Total Loan To Pay" name="TotalLoanToPay">
              <InputNumber
                style={{ width: "100%" }}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
        </Card>

        <Card title="Other Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Date Received" name="DateReceived">
              <DatePicker style={{ width: "100%" }} size="small" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Date Processed" name="DateProcessed">
              <DatePicker style={{ width: "100%" }} size="small" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Remarks" name="Remarks">
              <TextArea rows={2} size="small" />
            </Form.Item>
          </Col>
        </Row>
        </Card>
      </Form>
    </Modal>
  );
};

export default AddCollectionModal;
