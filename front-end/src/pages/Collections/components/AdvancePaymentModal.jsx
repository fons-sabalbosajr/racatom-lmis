import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Row,
  Col,
  Typography,
  Alert,
  Button,
  Tooltip,
  Switch,
} from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

/**
 * AdvancePaymentModal
 * Contract:
 *  Inputs via props:
 *    - visible: boolean
 *    - onCancel: () => void
 *    - onApply: ({ amount, days, startDate, endDate, remarks }) => void
 *    - paymentMode: 'DAILY'|'WEEKLY'|'SEMI-MONTHLY'|'MONTHLY'
 *    - amortizationPrincipal: number (per installment)
 *  Behavior:
 *    - User enters number of days to advance and a start date (defaults today)
 *    - We compute a per-day principal based on payment mode and per-installment principal
 *    - amount = round2(days * perDayPrincipal)
 */
const AdvancePaymentModal = ({
  visible,
  onCancel,
  onApply,
  paymentMode = "DAILY",
  amortizationPrincipal = 0,
}) => {
  const [form] = Form.useForm();
  const [days, setDays] = useState(1);
  const [startDate, setStartDate] = useState(dayjs());
  const [manualAmount, setManualAmount] = useState(null); // null means use computed
  const [autoAmount, setAutoAmount] = useState(true);

  useEffect(() => {
    if (visible) {
      setDays(1);
      setStartDate(dayjs());
      form.resetFields();
      setManualAmount(null);
      setAutoAmount(true);
    }
  }, [visible]);

  const modeDays = useMemo(() => {
    const m = String(paymentMode || "").toUpperCase();
    if (m === "DAILY") return 1;
    if (m === "WEEKLY") return 7;
    if (m === "SEMI-MONTHLY") return 15;
    if (m === "MONTHLY") return 30;
    return 1;
  }, [paymentMode]);

  const perDayPrincipal = useMemo(() => {
    const ap = Number(amortizationPrincipal || 0);
    if (!ap || !modeDays) return 0;
    return ap / modeDays;
  }, [amortizationPrincipal, modeDays]);

  const computed = useMemo(() => {
    const safeDays = Number(days || 0);
    const amt =
      Math.round((safeDays * perDayPrincipal + Number.EPSILON) * 100) / 100;
    const end = (startDate ? startDate : dayjs()).add(
      Math.max(0, safeDays),
      "day"
    );
    return { amount: isFinite(amt) ? amt : 0, endDate: end };
  }, [days, perDayPrincipal, startDate]);

  const handleApply = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const d = Number(days || 0);
    const sd = startDate || dayjs();
    const ed = computed.endDate;
    const amountToApply =
      manualAmount != null ? Number(manualAmount || 0) : computed.amount;
    if (!amountToApply || amountToApply <= 0) {
      return; // form rule below will show validation, keep silent here
    }
    const remarks = `Advance payment for next ${d} day(s), covering ${sd.format(
      "MM/DD/YYYY"
    )} to ${ed.format("MM/DD/YYYY")}.`;
    onApply?.({
      amount: amountToApply,
      days: d,
      startDate: sd,
      endDate: ed,
      remarks,
    });
  };

  // Keep form values in sync for validation and potential form-based dependencies
  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue({ days });
  }, [days, visible, form]);

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue({ startDate });
  }, [startDate, visible, form]);

  useEffect(() => {
    if (!visible) return;
    const val = autoAmount ? computed.amount : manualAmount ?? 0;
    form.setFieldsValue({ amount: val });
  }, [autoAmount, manualAmount, computed.amount, visible, form]);

  return (
    <Modal
      title="Advance Payment"
      open={visible}
      onCancel={onCancel}
      onOk={handleApply}
      okText="Apply"
      className="compact-modal"
      width={500}
    >
      <Form form={form} layout="vertical" size="small">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
          message={
            <span>
              Payment mode: <b>{String(paymentMode || "").toUpperCase()}</b> •
              Per-day principal: <b>₱{perDayPrincipal.toFixed(2)}</b>
            </span>
          }
        />
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Days to advance"
              name="days"
              rules={[{ required: true, message: "Enter days" }]}
              initialValue={1}
            >
              <InputNumber
                min={1}
                precision={0}
                value={days}
                onChange={setDays}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Start date"
              name="startDate"
              initialValue={dayjs()}
            >
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Covers until" shouldUpdate>
              <Text>{computed.endDate?.format("MM/DD/YYYY")}</Text>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Amount</span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {!autoAmount && (
                      <Tooltip title="Reset to computed amount">
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            setManualAmount(null);
                            setAutoAmount(true);
                          }}
                          style={{ marginLeft: "5px", fontSize: 11}}
                        >
                          Manual
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip title="Auto-calculate from days and payment mode">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Switch
                          size="small"
                          checked={autoAmount}
                          onChange={(c) => {
                            setAutoAmount(c);
                            if (c) setManualAmount(null);
                          }}
                          style={{ marginLeft: "5px" }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Auto
                        </Text>
                      </span>
                    </Tooltip>
                  </div>
                </div>
              }
              name="amount"
              rules={[{ required: true, message: "Amount is required" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                value={autoAmount ? computed.amount : manualAmount ?? 0}
                onChange={(v) => {
                  setManualAmount(Number(v));
                  setAutoAmount(false);
                }}
                disabled={autoAmount}
                min={0.01}
                parser={(value) => String(value).replace(/\₱\s?|(,*)/g, "")}
                formatter={(value) =>
                  `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>

        <Text type="secondary" style={{ fontSize: 12 }}>
          The computed amount uses principal-only amortization proportional to
          days covered.
        </Text>
      </Form>
    </Modal>
  );
};

export default AdvancePaymentModal;
