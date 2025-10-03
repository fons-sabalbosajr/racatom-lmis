import React from 'react';
import { Row, Col, Input, Typography, Card, Form } from 'antd';

const { Text } = Typography;

/**
 * A tab component for displaying and editing account security details.
 * @param {object} props - The component props.
 * @param {object} props.editedLoan - The loan object being edited.
 * @param {function} props.handleChange - Function to handle input changes.
 * @param {boolean} props.isEditing - Flag to determine if the form is in edit mode.
 */
const LoanAccountSecurityTab = ({ editedLoan, handleChange, isEditing }) => {
  // Helper to render a consistent form field
  const renderSecurityField = (label, fieldPath, value) => (
    <Form.Item label={<Text strong>{label}</Text>} style={{ marginBottom: 16 }}>
      <Input
        value={value || ''}
        onChange={(e) => handleChange(fieldPath, e.target.value)}
        disabled={!isEditing}
        placeholder={`Enter ${label}`}
      />
    </Form.Item>
  );

  return (
    <Card title="Account Security & Identifiers" bordered={false}>
      <Row gutter={24}>
        <Col span={12}>
          {renderSecurityField('Client Number', 'clientNo', editedLoan?.clientNo)}
        </Col>
        <Col span={12}>
          {/* This is the primary loan number associated with the client's main record, not the cycle-specific one */}
          {renderSecurityField('Primary Loan Number', 'loanInfo.loanNo', editedLoan?.loanInfo?.loanNo)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderSecurityField('Account ID', 'accountId', editedLoan?.accountId)}
        </Col>
        {/* This column is available for any future reference numbers */}
        <Col span={12} />
      </Row>
      {!isEditing && (
        <Text type="secondary">
          Click the 'Edit' button in the footer to modify these details.
        </Text>
      )}
    </Card>
  );
};

export default LoanAccountSecurityTab;