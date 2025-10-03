import React, { useState } from "react";
import {
  Form,
  InputNumber,
  Select,
  Row,
  Col,
  Typography,
  Divider,
  Alert,
  Card,
} from "antd";

const { Option } = Select;
const { Text } = Typography;

const formItemStyle = { marginBottom: 8 };

const Step3_LoanInfo = ({ form, onValuesChange, loanRates }) => {
  const [breakdown, setBreakdown] = useState(null);

  const handleValuesChange = (_, allValues) => {
    const principal = Number(allValues.LoanAmount) || 0;
    const interestRate = Number(allValues["Interest Rate/Month"]) || 0;
    const terms = Number(allValues.LoanTerms) || 0;
    const paymentMode = allValues.PaymentMode || "";
    const processingFeeAmount = Number(allValues["Processing Fee"]) || 0;
    const penaltyRate = Number(allValues["Penalty Rate"]) || 0;

    // ✅ Loan to be Disbursed = LoanAmount - ProcessingFee
    const loanToBeDisbursed = principal - processingFeeAmount;

    if (principal > 0 && interestRate > 0 && terms > 0 && paymentMode) {
      const totalInterest = principal * (interestRate / 100) * terms;
      const penaltyAmount = principal * (penaltyRate / 100);
      const totalLoan = principal + totalInterest + processingFeeAmount;

      let numberOfPeriods = 0;
      switch (paymentMode) {
        case "DAILY":
          numberOfPeriods = 6 * 4 * terms;
          break;
        case "WEEKLY":
          numberOfPeriods = 4 * terms;
          break;
        case "MONTHLY":
        default:
          numberOfPeriods = terms;
      }

      const amortizationAmount =
        numberOfPeriods > 0 ? totalLoan / numberOfPeriods : 0;

      // ✅ Round to 2 decimals
      const roundedTotalLoan = parseFloat(totalLoan.toFixed(2));
      const roundedAmortization = parseFloat(amortizationAmount.toFixed(2));
      const roundedLoanToBeDisbursed = parseFloat(loanToBeDisbursed.toFixed(2));

      form.setFieldsValue({
        "Total Loan to be Paid": roundedTotalLoan,
        Amortization: roundedAmortization,
        "Loan to be Disbursed": roundedLoanToBeDisbursed,
      });

      setBreakdown({
        principal: parseFloat(principal.toFixed(2)) || 0,
        totalInterest: parseFloat(totalInterest.toFixed(2)) || 0,
        processingFeeAmount: parseFloat(processingFeeAmount.toFixed(2)) || 0,
        penaltyAmount: parseFloat(penaltyAmount.toFixed(2)) || 0,
        totalLoan: roundedTotalLoan || 0,
        numberOfPeriods: numberOfPeriods || 0,
        amortizationAmount: roundedAmortization || 0,
        loanToBeDisbursed: roundedLoanToBeDisbursed || 0,
      });
    } else {
      setBreakdown(null);
      form.setFieldsValue({
        "Total Loan to be Paid": undefined,
        Amortization: undefined,
        "Loan to be Disbursed": undefined,
      });
    }

    if (onValuesChange) {
      onValuesChange(_, allValues);
    }
  };

  const handleRateChange = (rateId) => {
    // 🔸 When dropdown is cleared (rateId = null), reset all loan fields
    if (!rateId) {
      form.resetFields([
        "LoanAmount",
        "LoanTerms",
        "PaymentMode",
        "Processing Fee",
        "Interest Rate/Month",
        "Penalty Rate",
        "Loan to be Disbursed",
        "Total Loan to be Paid",
        "Amortization",
      ]);
      setBreakdown(null);
      return;
    }

    // 🔸 When a valid rate is selected, populate fields
    const rate = loanRates.find((r) => r._id === rateId);
    if (rate) {
      form.setFieldsValue({
        LoanAmount: rate.Principal,
        LoanTerms: rate.Term,
        PaymentMode: rate.Mode,
        "Processing Fee": rate["Processing Fee"],
        "Interest Rate/Month": rate["Interest Rate/Month"],
        "Penalty Rate": rate["Penalty Rate"],
      });

      // Trigger recomputation
      setTimeout(() => handleValuesChange({}, form.getFieldsValue()), 0);
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
      name: "Interest Rate/Month",
      label: "Interest % / Month",
      type: "number",
      required: true,
    },
    {
      name: "Processing Fee",
      label: "Processing Fee",
      type: "number",
      required: true,
    },
    { name: "Penalty Rate", label: "Penalty Rate %", type: "number" },
    {
      name: "PaymentMode",
      label: "Payment Mode",
      type: "select",
      options: ["DAILY", "WEEKLY", "MONTHLY"],
      required: true,
    },
    {
      name: "Loan to be Disbursed",
      label: "Loan to be Disbursed",
      type: "number",
    },
    { name: "Amortization", label: "Amortization", type: "number" },
    {
      name: "Total Loan to be Paid",
      label: "Total Loan to be Paid",
      type: "number",
    },
  ];

  const currencyFormatter = (value) =>
    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const currencyParser = (value) => value.replace(/\₱\s?|(,*)/g, "");

  return (
    <Card bordered={false}>
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label="Select Loan Rate" style={formItemStyle}>
              <Select
                placeholder="Select or search a loan configuration"
                onChange={handleRateChange}
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {(loanRates || []).map((rate) => (
                  <Option key={rate._id} value={rate._id}>
                    {`${rate.Type} - ₱${rate.Principal.toLocaleString()} (${
                      rate.Mode
                    })`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {fields.map((field) => {
            const currencyFields = [
              "LoanAmount",
              "Processing Fee",
              "Loan to be Disbursed",
              "Amortization",
              "Total Loan to be Paid",
            ];
            const percentageFields = ["Interest Rate/Month", "Penalty Rate"];
            const isReadOnly = [
              "Loan to be Disbursed",
              "Amortization",
              "Total Loan to be Paid",
            ].includes(field.name);

            if (field.type === "select") {
              return (
                <Col xs={24} md={6} key={field.name}>
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    rules={[{ required: field.required }]}
                    style={formItemStyle}
                  >
                    <Select placeholder="Select Mode" size="small">
                      {field.options.map((opt) => (
                        <Option key={opt} value={opt}>
                          {opt}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              );
            }

            if (field.type === "number") {
              return (
                <Col xs={24} md={6} key={field.name}>
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    rules={[{ required: field.required }]}
                    style={formItemStyle}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      size="small"
                      readOnly={isReadOnly}
                      placeholder={isReadOnly ? "Auto-computed" : "0"}
                      addonBefore={
                        currencyFields.includes(field.name) ? "₱" : null
                      }
                      addonAfter={
                        percentageFields.includes(field.name) ? "%" : null
                      }
                      formatter={
                        currencyFields.includes(field.name)
                          ? currencyFormatter
                          : undefined
                      }
                      parser={
                        currencyFields.includes(field.name)
                          ? currencyParser
                          : undefined
                      }
                    />
                  </Form.Item>
                </Col>
              );
            }
            return null;
          })}
        </Row>

        {breakdown && (
          <>
            <Divider />
            <Alert
              type="info"
              showIcon
              message={
                <div>
                  <Text strong>Computation Breakdown:</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    <li>
                      Principal:{" "}
                      <Text strong>
                        ₱
                        {(breakdown.principal ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </li>
                    <li>
                      Processing Fee:{" "}
                      <Text strong>
                        ₱
                        {(breakdown.processingFeeAmount ?? 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </Text>
                    </li>
                    <li>
                      Loan to be Disbursed:{" "}
                      <Text strong>
                        ₱
                        {(breakdown.loanToBeDisbursed ?? 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </Text>
                    </li>
                    <li>
                      Total Interest:{" "}
                      <Text strong>
                        ₱
                        {(breakdown.totalInterest ?? 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </Text>
                    </li>
                    <li>
                      Total Loan:{" "}
                      <Text strong>
                        ₱
                        {(breakdown.totalLoan ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </li>
                    <li>
                      Amortization ({breakdown.numberOfPeriods} payments):{" "}
                      <Text strong>
                        ₱
                        {(breakdown.amortizationAmount ?? 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </Text>
                    </li>
                  </ul>
                </div>
              }
            />
          </>
        )}
      </Form>
    </Card>
  );
};

export default Step3_LoanInfo;
