import React, { useState, useEffect } from "react";
import { Form, Select, InputNumber, Row, Col, Card, message } from "antd";
import axios from "axios";

const { Option } = Select;

const Step3_LoanInfo = ({ form, onValuesChange }) => {
  const [loanRates, setLoanRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchLoanRates = async () => {
      try {
        const res = await axios.get(`${API_BASE}/loan_rates`);
        setLoanRates(res.data);
      } catch (err) {
        console.error(err);
        message.error("Failed to fetch loan rates");
      }
    };
    fetchLoanRates();
  }, [API_BASE]);

  const handleRateChange = (rateId) => {
    const rate = loanRates.find((r) => r._id === rateId);
    if (rate) {
      setSelectedRate(rate);
      form.setFieldsValue({
        ...rate,
        LoanAmount: rate.Principal, // Assuming Principal from rate is the LoanAmount
        LoanTerms: rate.Term,
        PaymentMode: rate.Mode,
      });
      onValuesChange(null, form.getFieldsValue());
    }
  };

  const fields = [
    {
      name: "LoanAmount",
      label: "Loan Amount",
      type: "number",
      required: true,
    },
    {
      name: "LoanTerms",
      label: "Loan Terms (months)",
      type: "number",
      required: true,
    },
    {
      name: "PaymentMode",
      label: "Payment Mode",
      type: "select",
      options: ["DAILY", "WEEKLY", "MONTHLY"],
      required: true,
    },
    { name: "Processing Fee", label: "Processing Fee", type: "number" },
    {
      name: "Interest Rate/Month",
      label: "Interest Rate/Month",
      type: "number",
    },
    { name: "Penalty Rate", label: "Penalty Rate", type: "number" },
  ];

  const handleValuesChange = (changedValues, allValues) => {
    const {
      LoanAmount,
      "Interest Rate/Month": interestRate,
      LoanTerms,
      "Processing Fee": processingFee,
      PaymentMode,
    } = allValues;

    if (LoanAmount && interestRate && LoanTerms && PaymentMode) {
      let periods = 0;

      // Decide periods based on payment mode
      switch (PaymentMode) {
        case "DAILY":
          periods = LoanTerms * 30; // assuming 30 days per month
          break;
        case "WEEKLY":
          periods = LoanTerms * 4; // 4 weeks per month
          break;
        case "MONTHLY":
        default:
          periods = LoanTerms; // months directly
          break;
      }

      // Interest is applied per month, so scale it with periods/LoanTerms if DAILY/WEEKLY
      const totalInterest = LoanAmount * (interestRate / 100) * LoanTerms;
      const totalLoan = LoanAmount + totalInterest + (processingFee || 0);

      form.setFieldsValue({ "Total Loan to be Paid": totalLoan });
    }

    onValuesChange(changedValues, allValues);
  };

  return (
    <Card title="Step 3: Loan Information" bordered={false}>
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Form.Item label="Select Loan Configuration">
          <Select
            placeholder="Select a pre-configured loan rate"
            onChange={handleRateChange}
            allowClear
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {loanRates.map((rate) => (
              <Option key={rate._id} value={rate._id}>
                {`Type: ${rate.Type} - Principal: ${rate.Principal} - Term: ${rate.Term} months - Mode: ${rate.Mode}`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          {fields.map((field) => {
            const currencyFields = ["LoanAmount", "Processing Fee"];
            const percentageFields = ["Interest Rate/Month", "Penalty Rate"];

            const isCurrency = currencyFields.includes(field.name);
            const isPercentage = percentageFields.includes(field.name);

            return (
              <Col xs={24} sm={12} md={8} key={field.name}>
                <Form.Item
                  name={field.name}
                  label={field.label}
                  rules={[
                    {
                      required: field.required,
                      message: `Please input the ${field.label}!`,
                    },
                  ]}
                >
                  {field.type === "number" ? (
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder={`Enter ${field.label}`}
                      addonBefore={isCurrency ? "₱" : null}
                      addonAfter={isPercentage ? "%" : null}
                    />
                  ) : (
                    <Select placeholder={`Select ${field.label}`}>
                      {field.options &&
                        field.options.map((opt) => (
                          <Option key={opt} value={opt}>
                            {opt}
                          </Option>
                        ))}
                    </Select>
                  )}
                </Form.Item>
              </Col>
            );
          })}
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="Total Loan to be Paid"
              label="Total Loan to be Paid"
            >
              <InputNumber
                style={{ width: "100%" }}
                disabled
                addonBefore={"₱"}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default Step3_LoanInfo;
