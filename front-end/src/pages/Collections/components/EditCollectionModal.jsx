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
  Tag,
  Dropdown,
} from "antd";
import { InfoCircleOutlined, EditOutlined, CopyOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import AdvancePaymentModal from "./AdvancePaymentModal";

const { Option } = Select;
const { Panel } = Collapse;

const EditCollectionModal = ({ visible, onCancel, onSuccess, collectionData, loan }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [paymentVia, setPaymentVia] = useState("Cash");
  const [onlinePlatform, setOnlinePlatform] = useState("");
  const [bankName, setBankName] = useState("");
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [collectionRefNo, setCollectionRefNo] = useState("");
  const [customRefOpen, setCustomRefOpen] = useState(false);
  const [customRefDraft, setCustomRefDraft] = useState("");

  const computeAmortizationPrincipal = () => {
    try {
      const principal = Number(loan?.loanInfo?.principal || 0);
      const termStr = String(loan?.loanInfo?.term || "");
      const months = parseInt(termStr, 10) || 0;
      const pm = String(loan?.loanInfo?.paymentMode || "").toUpperCase();
      const perMonth =
        pm === "MONTHLY"
          ? 1
          : pm === "SEMI-MONTHLY"
          ? 2
          : pm === "WEEKLY"
          ? 4
          : pm === "DAILY"
          ? 26
          : 1;
      const installments = months * perMonth || 1;
      if (!principal || !installments) return 0;
      return Math.round((principal / installments) * 100) / 100;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (visible && collectionData) {
      form.resetFields();

      const paymentMethod = collectionData.PaymentVia || "Cash";
      setPaymentVia(paymentMethod);
      setOnlinePlatform(collectionData.OnlinePlatform || "");
      setBankName(collectionData.BankName || "");
      setCollectionRefNo(collectionData.CollectionReferenceNo || "");

      form.setFieldsValue({
        CollectionPayment: collectionData.CollectionPayment,
        PaymentType: collectionData.PaymentType,
        PaymentVia: collectionData.PaymentVia,
        OnlinePlatform: collectionData.OnlinePlatform,
        BankName: collectionData.BankName,
        OtherOnlinePlatform: collectionData.OtherOnlinePlatform,
        OtherBankName: collectionData.OtherBankName,
        OnlineRefNo: collectionData.OnlineRefNo,
        BankRefNo: collectionData.BankRefNo,
        CollectorName: collectionData.CollectorName,
        DateReceived: collectionData.DateReceived ? dayjs(collectionData.DateReceived) : null,
        DateProcessed: collectionData.DateProcessed ? dayjs(collectionData.DateProcessed) : null,
        Remarks: collectionData.Remarks,

        // Summary fields
        LoanCycleNo: collectionData.LoanCycleNo,
        LoanAmount: loan?.loanInfo?.amount,
        LoanTerm: loan?.loanInfo?.term,
        PaymentMode: loan?.loanInfo?.paymentMode,
        AmortizationPrincipal: computeAmortizationPrincipal(),
        LoanToBePaid: loan?.loanInfo?.amount || 0,
        LoanAmountCollected: 0,
        RemainingBalance: loan?.loanInfo?.balance || 0,
      });

      // Fetch collectors
      api.get("/collectors").then((res) => {
        if (res.data.success) {
          setCollectors(res.data.data);
        } else {
          message.error("Failed to fetch collector names.");
        }
      });
    }
  }, [visible, collectionData, loan, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const decimalFields = [
        'Amortization', 'AmortizationPrincipal',
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

      // Fallback for reference no like Add modal
      if (!payload.CollectionReferenceNo) {
        payload.CollectionReferenceNo = payload.OnlineRefNo || payload.BankRefNo || '';
      }
      if (!payload.CollectionReferenceNo || String(payload.CollectionReferenceNo).trim().length === 0) {
        message.error('Reference No. is required. Click the edit icon near Ref No to set a value.');
        setLoading(false);
        return;
      }

      const res = await api.put(`/loan-collections/${collectionData._id}`, payload);

      if (res.data.success) {
        message.success("Collection updated successfully!");
        onSuccess();
        onCancel();
      } else {
        message.error(res.data.message || "Failed to update collection.");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
      console.error("Error updating collection:", errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const paymentsTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>Edit Payment</span>
      <span style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Tag className="refno-tag" color={collectionRefNo ? 'blue' : 'default'} style={{ margin: 0 }}>
          {collectionRefNo || '—'}
        </Tag>
        <Tooltip title="Edit reference number">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setCustomRefDraft(collectionRefNo); setCustomRefOpen(true); }} />
        </Tooltip>
        <Tooltip title="Copy to clipboard">
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={async () => { try { if (collectionRefNo && navigator?.clipboard?.writeText) await navigator.clipboard.writeText(collectionRefNo); message.success('Reference No. copied'); } catch {} }} disabled={!collectionRefNo} />
        </Tooltip>
      </span>
    </div>
  );

  return (
    <Modal
      title="Edit Collection"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={520}
      className="compact-modal"
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item name="CollectionReferenceNo" hidden>
            <Input />
        </Form.Item>
        <Card title={paymentsTitle} size="small" style={{ marginBottom: 16 }}>
           <Row gutter={16}>
            <Col span={24}>
              <Form.Item label={
                <span>
                  Enter Collection Payment{' '}
                  <Tooltip title="Information about collection payment.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </span>
              } name="CollectionPayment" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: "100%" }}
                  parser={(value) => value.replace(/\₱\s?|(,*)/g, "")}
                  formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  size="small"
                />
              </Form.Item>
              <Form.Item name="PaymentType" initialValue="Regular Payment">
                <Radio.Group size="small" onChange={(e) => { if (e.target.value === 'Advance Payment') setAdvanceOpen(true); }}>
                  <Radio value="Regular Payment">Regular Payment</Radio>
                  <Radio value="Advance Payment">Advance Payment</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Payment via" name="PaymentVia">
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
                  <Select size="small" placeholder="Select Platform" onChange={setOnlinePlatform}>
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
                  <Select size="small" placeholder="Select Bank" onChange={setBankName}>
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
          {onlinePlatform === 'Other' && (
            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item label="E-Wallet Name" name="OtherOnlinePlatform">
                        <Input size="small" placeholder="Enter E-Wallet Name" />
                    </Form.Item>
                </Col>
            </Row>
          )}
          {bankName === 'Other' && (
            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item label="Bank Name" name="OtherBankName">
                        <Input size="small" placeholder="Enter Bank Name" />
                    </Form.Item>
                </Col>
            </Row>
          )}
          {paymentVia === 'Online Payment' && (
            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item label="Reference No." name="OnlineRefNo">
                        <Input size="small" />
                    </Form.Item>
                </Col>
            </Row>
          )}
          {paymentVia === 'Bank Transfer' && (
            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item label="Reference No." name="BankRefNo">
                        <Input size="small" />
                    </Form.Item>
                </Col>
            </Row>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Collector Name" name="CollectorName" rules={[{ required: true }]}>
                <Select placeholder="Select Collector" size="small">
                  {collectors.map((collector) => (
                    <Option key={collector._id} value={collector.Name}>{collector.Name}</Option>
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
              <Col span={12}><Form.Item label="Loan Cycle No." name="LoanCycleNo"><Input size="small" disabled /></Form.Item></Col>
              <Col span={12}><Form.Item label="Loan Amount" name="LoanAmount"><InputNumber size="small" style={{ width: "100%" }} disabled /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item label="Loan Term" name="LoanTerm"><Input size="small" disabled /></Form.Item></Col>
              <Col span={12}><Form.Item label="Payment Mode" name="PaymentMode"><Input size="small" disabled /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item label="Amortization (Principal)" name="AmortizationPrincipal"><InputNumber size="small" style={{ width: "100%" }} disabled /></Form.Item></Col>
            </Row>
          </Panel>
        </Collapse>

        <Collapse size="small">
          <Panel header="Collection Summary" key="2">
            <Row gutter={16}>
              <Col span={12}><Form.Item label="Loan to be Paid" name="LoanToBePaid"><InputNumber size="small" style={{ width: "100%" }} disabled /></Form.Item></Col>
              <Col span={12}><Form.Item label="Loan Amount Collected" name="LoanAmountCollected"><InputNumber size="small" style={{ width: "100%" }} disabled /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item label="Remaining Balance" name="RemainingBalance"><InputNumber size="small" style={{ width: "100%" }} disabled /></Form.Item></Col>
            </Row>
          </Panel>
        </Collapse>
      </Form>

      {/* Advance Payment compute modal */}
      <AdvancePaymentModal
        visible={advanceOpen}
        onCancel={() => {
          setAdvanceOpen(false);
          const cur = form.getFieldValue('PaymentType');
          if (cur === 'Advance Payment') {
            form.setFieldsValue({ PaymentType: 'Regular Payment' });
          }
        }}
        onApply={({ amount, days, startDate, endDate, remarks }) => {
          setAdvanceOpen(false);
          form.setFieldsValue({
            PaymentType: 'Advance Payment',
            CollectionPayment: amount,
            DateReceived: startDate,
            DateProcessed: startDate,
            Remarks: remarks,
          });
          message.success(`Advance payment applied: ₱${amount.toLocaleString()}`);
        }}
        paymentMode={loan?.loanInfo?.paymentMode}
        amortizationPrincipal={computeAmortizationPrincipal()}
      />

      <Modal
        title="Enter Custom Reference No"
        open={customRefOpen}
        onCancel={() => setCustomRefOpen(false)}
        onOk={() => {
          const v = (customRefDraft || '').trim();
          setCollectionRefNo(v);
          form.setFieldsValue({ CollectionReferenceNo: v });
          setCustomRefOpen(false);
        }}
        okText="Use This Ref"
        cancelText="Cancel"
        width={380}
      >
        <Input
          value={customRefDraft}
          onChange={(e) => setCustomRefDraft(e.target.value)}
          placeholder="Type reference number"
          size="small"
        />
      </Modal>
    </Modal>
  );
};

export default EditCollectionModal;