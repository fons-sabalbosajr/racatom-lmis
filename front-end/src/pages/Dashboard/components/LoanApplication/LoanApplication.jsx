
import React, { useState } from 'react';
import { Modal, Steps, Button, Form, message, Descriptions, Card, Typography } from 'antd';

import Step1_GeneralInfo from './components/Step1_GeneralInfo';
import Step2_DocumentRequirements from './components/Step2_DocumentRequirements';
import Step3_LoanInfo from './components/Step3_LoanInfo';
import moment from 'moment';

const { Step } = Steps;
const { Title } = Typography;

const LoanApplication = ({ visible, onClose, api }) => {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState({});
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleValuesChange = (changedValues, allValues) => {
    setFormData(prevData => ({ ...prevData, ...allValues }));
  };

  const steps = [
    {
      title: 'General Information',
      content: <Step1_GeneralInfo form={form} onValuesChange={handleValuesChange} />,
    },
    {
      title: 'Document Requirements',
      content: <Step2_DocumentRequirements onUploadChange={(fileList) => setFormData({...formData, UploadedDocs: fileList})} />,
    },
    {
      title: 'Loan Information',
      content: <Step3_LoanInfo form={form} onValuesChange={handleValuesChange} />,
    },
    {
        title: 'Review & Submit',
        content: 'Review'
    }
  ];

  const next = () => {
    form.validateFields().then(() => {
        setCurrent(current + 1);
    }).catch(info => {
        console.log('Validate Failed:', info);
        if (current === 1 && steps[current].title === 'Document Requirements') { 
            setCurrent(current + 1);
        }
    });
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
        const values = await form.getFieldsValue(true);
        const finalData = { ...formData, ...values };
        console.log('Submitting:', finalData);
        await api.post(`/loans/loan_clients_application`, finalData);
        message.success('Loan application submitted successfully!');
        setCurrent(0);
        form.resetFields();
        onClose();
    } catch (error) {
        console.error('Submission failed', error);
        message.error('Failed to submit loan application.');
    } finally {
        setLoading(false);
    }
  };

  const renderReview = () => {
    const allValues = form.getFieldsValue(true);
    const finalData = { ...formData, ...allValues };

    const step1Fields = ['AccountId', 'FirstName', 'MiddleName', 'LastName', 'NameSuffix', 'DateOfBirth', 'Age', 'ContactNo', 'AlternateContactNo', 'Email', 'CurrentAddress', 'Occupation', 'OccupationAddress', 'LoanRecord', 'PreviousLoan', 'CoMaker'];
    const step3Fields = ['LoanAmount', 'LoanTerms', 'PaymentMode', 'Processing Fee', 'Interest Rate/Month', 'Penalty Rate', 'Notarial Rate', 'Annotation Rate', 'Insurance Rate', 'Vat Rate', 'Doc Rate', 'Misc. Rate'];

    const renderValue = (value) => {
        if (moment.isMoment(value)) {
            return value.format('YYYY-MM-DD');
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            return <pre>{JSON.stringify(value, null, 2)}</pre>;
        }
        return value;
    }

    return (
        <Card title="Review Application Details">
            <Title level={5}>General Information</Title>
            <Descriptions bordered column={1} size="small">
                {step1Fields.map(field => (
                    finalData[field] && <Descriptions.Item label={field} key={field}>{renderValue(finalData[field])}</Descriptions.Item>
                ))}
            </Descriptions>

            <Title level={5} style={{ marginTop: 24 }}>Loan Information</Title>
            <Descriptions bordered column={1} size="small">
                {step3Fields.map(field => (
                    finalData[field] && <Descriptions.Item label={field} key={field}>{renderValue(finalData[field])}</Descriptions.Item>
                ))}
            </Descriptions>

            <Title level={5} style={{ marginTop: 24 }}>Documents</Title>
            <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Uploaded Documents">
                    {finalData.UploadedDocs?.length ? `${finalData.UploadedDocs.length} file(s) attached` : 'No files attached'}
                </Descriptions.Item>
            </Descriptions>
        </Card>
    );
  };

  return (
    <Modal
        open={visible}
        title="New Loan Application"
        onCancel={onClose}
        footer={null}
        width={1000}
        centered
    >
        <Steps current={current} style={{ margin: '24px 0'}}>
            {steps.map(item => (
            <Step key={item.title} title={item.title} />
            ))}
        </Steps>
        <div className="steps-content" style={{marginTop: '24px'}}>
            {current === steps.length - 1 ? renderReview() : steps[current].content}
        </div>
        <div className="steps-action" style={{marginTop: '24px', textAlign: 'right'}}>
            {current > 0 && (
            <Button style={{ margin: '0 8px' }} onClick={() => prev()}>
                Previous
            </Button>
            )}
            {current < steps.length - 1 && (
            <Button type="primary" onClick={() => next()}>
                Next
            </Button>
            )}
            {current === steps.length - 1 && (
            <Button type="primary" onClick={handleSubmit} loading={loading}>
                Submit Application
            </Button>
            )}
        </div>
    </Modal>
  );
};

export default LoanApplication;
