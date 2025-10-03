import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  DatePicker,
  Checkbox,
  Row,
  Col,
  Card,
  Typography,
  Divider,
  InputNumber,
  Radio,
  AutoComplete,
  Spin,
  Select,
} from "antd";
import dayjs from "dayjs";
import api from "../../../../../utils/axios";

const { Title } = Typography;
const { Option } = Select;
const { Option: AutoCompleteOption } = AutoComplete;

const formItemStyle = { marginBottom: 8 };
const formInputStyle = { height: "32px", width: "100%" };

// --- FORM FOR A NEW APPLICATION ---
const NewApplicationForm = ({ form, handleLoanTypeChange }) => {
  const [hasLoanRecord, setHasLoanRecord] = useState(false);

  useEffect(() => {
    const fetchNextAccountId = async () => {
      try {
        const response = await api.get("/users/next-account-id");
        if (response.data.success) {
          form.setFieldsValue({ AccountId: response.data.accountId });
        }
      } catch (error) {
        console.error("Failed to fetch next account ID", error);
      }
    };
    fetchNextAccountId();
  }, [form]);

  const handleAgeCalculation = (date) => {
    if (date) {
      const age = dayjs().diff(date, "years");
      form.setFieldsValue({ Age: age });
    }
  };

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={5} style={{ margin: 0 }}>
            Client Information
          </Title>
        </Col>
        <Col>
          <Radio.Group onChange={handleLoanTypeChange} value="New">
            <Radio value="New">New Application</Radio>
            <Radio value="Renewal">Renewal</Radio>
          </Radio.Group>
        </Col>
      </Row>
      <Divider style={{ marginTop: 0 }} />
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Account ID" name="AccountId" style={formItemStyle}>
            <Input readOnly style={formInputStyle} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="First Name"
            name="FirstName"
            rules={[{ required: true }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter first name" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Middle Name"
            name="MiddleName"
            style={formItemStyle}
          >
            <Input placeholder="Enter middle name" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Last Name"
            name="LastName"
            rules={[{ required: true }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter last name" style={formInputStyle} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="Name Suffix"
            name="NameSuffix"
            style={formItemStyle}
          >
            <Input placeholder="e.g., Jr., Sr., III" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Birthday" name="DateOfBirth" style={formItemStyle}>
            <DatePicker
              style={formInputStyle}
              onChange={handleAgeCalculation}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Age" name="Age" style={formItemStyle}>
            <InputNumber
              style={formInputStyle}
              readOnly
              placeholder="Auto-calculated"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="Contact No."
            name="ContactNo"
            rules={[{ required: true }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter contact number" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Alternate Contact No."
            name="AlternateContactNo"
            style={formItemStyle}
          >
            <Input
              placeholder="Enter alternate contact number"
              style={formInputStyle}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Email Address"
            name="Email"
            rules={[{ type: "email" }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter email address" style={formInputStyle} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Current Address"
            name="CurrentAddress"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} placeholder="Enter current address" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="Occupation" name="Occupation" style={formItemStyle}>
            <Input placeholder="Enter occupation" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Occupation Address"
            name="OccupationAddress"
            style={formItemStyle}
          >
            <Input
              placeholder="Enter occupation address"
              style={formInputStyle}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="LoanRecord"
        valuePropName="checked"
        style={formItemStyle}
      >
        <Checkbox onChange={(e) => setHasLoanRecord(e.target.checked)}>
          Has previous loan record?
        </Checkbox>
      </Form.Item>
      {hasLoanRecord && (
        <Card
          size="small"
          title="Previous Loan Details"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Last Loan Record"
                name={["PreviousLoan", "Record"]}
                style={formItemStyle}
              >
                <Input
                  placeholder="Enter last loan record"
                  style={formInputStyle}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Date"
                name={["PreviousLoan", "Date"]}
                style={formItemStyle}
              >
                <DatePicker style={formInputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Amount"
                name={["PreviousLoan", "Amount"]}
                style={formItemStyle}
              >
                <InputNumber
                  style={formInputStyle}
                  placeholder="Enter amount"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Status"
                name={["PreviousLoan", "Status"]}
                style={formItemStyle}
              >
                <Select
                  placeholder="Select a status"
                  allowClear
                  style={formInputStyle}
                >
                  <Option value="UPDATED">UPDATED</Option>
                  <Option value="PAST DUE">PAST DUE</Option>
                  <Option value="ARREARS">ARREARS</Option>
                  <Option value="LITIGATION">LITIGATION</Option>
                  <Option value="DORMANT">DORMANT</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )}
      <Divider />
      <Title level={5}>Co-Borrower / Co-Maker Information</Title>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Name"
            name={["CoMaker", "Name"]}
            style={formItemStyle}
          >
            <Input placeholder="Enter co-maker's name" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Contact No."
            name={["CoMaker", "ContactNo"]}
            style={formItemStyle}
          >
            <Input
              placeholder="Enter co-maker's contact number"
              style={formInputStyle}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label="Address"
            name={["CoMaker", "Address"]}
            style={formItemStyle}
          >
            <Input.TextArea rows={2} placeholder="Enter co-maker's address" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Relationship to Client"
            name={["CoMaker", "Relationship"]}
            style={formItemStyle}
          >
            <Input
              placeholder="Enter relationship to client"
              style={formInputStyle}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

// --- FORM FOR A RENEWAL APPLICATION ---
const RenewalApplicationForm = ({
  form,
  onClientSelect,
  handleLoanTypeChange,
}) => {
  const [searching, setSearching] = useState(false);
  const [clients, setClients] = useState([]);

  const handleSearch = async (value) => {
    if (value) {
      setSearching(true);
      try {
        const response = await api.get(`/loans/search-clients?q=${value}`);
        if (response.data.success) setClients(response.data.data);
      } catch (error) {
        console.error("Error searching clients", error);
      }
      setSearching(false);
    } else {
      setClients([]);
    }
  };

  const onSelect = (_, option) => onClientSelect(option.client);

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={5} style={{ margin: 0 }}>
            Search Existing Client
          </Title>
        </Col>
        <Col>
          <Radio.Group onChange={handleLoanTypeChange} value="Renewal">
            <Radio value="New">New Application</Radio>
            <Radio value="Renewal">Renewal</Radio>
          </Radio.Group>
        </Col>
      </Row>
      <Divider style={{ marginTop: 0 }} />
      <AutoComplete
        style={formInputStyle}
        onSearch={handleSearch}
        onSelect={onSelect}
        placeholder="Search by name or Account ID"
        notFoundContent={searching ? <Spin size="small" /> : "No client found"}
      >
        {clients.map((client) => (
          <AutoCompleteOption
            key={client.ClientNo}
            value={`${client.FirstName} ${client.LastName} (${client.AccountId})`}
            client={client}
          >{`${client.FirstName} ${client.LastName} (${client.AccountId})`}</AutoCompleteOption>
        ))}
      </AutoComplete>
      <Divider />
      <Title level={5}>Client Information</Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Account ID" name="AccountId" style={formItemStyle}>
            <Input readOnly style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="First Name" name="FirstName" style={formItemStyle}>
            <Input readOnly style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Middle Name"
            name="MiddleName"
            style={formItemStyle}
          >
            <Input readOnly style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Last Name" name="LastName" style={formItemStyle}>
            <Input readOnly style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Name Suffix"
            name="NameSuffix"
            style={formItemStyle}
          >
            <Input readOnly style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Age" name="Age" style={formItemStyle}>
            <InputNumber style={formInputStyle} readOnly />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Contact No." name="ContactNo" style={formItemStyle}>
            <Input style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Alternate Contact No."
            name="AlternateContactNo"
            style={formItemStyle}
          >
            <Input style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Email Address"
            name="Email"
            rules={[{ type: "email" }]}
            style={formItemStyle}
          >
            <Input style={formInputStyle} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Current Address"
            name="CurrentAddress"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="Occupation" name="Occupation" style={formItemStyle}>
            <Input style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Occupation Address"
            name="OccupationAddress"
            style={formItemStyle}
          >
            <Input style={formInputStyle} />
          </Form.Item>
        </Col>
      </Row>

      <Card
        size="small"
        title="Previous Loan Details"
        style={{ margin: "16px 0" }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Last Loan Record"
              name={["PreviousLoan", "Record"]}
              style={formItemStyle}
            >
              <Input readOnly style={formInputStyle} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Date"
              name={["PreviousLoan", "Date"]}
              style={formItemStyle}
            >
              <DatePicker style={formInputStyle} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Amount"
              name={["PreviousLoan", "Amount"]}
              style={formItemStyle}
            >
              <InputNumber style={formInputStyle} readOnly />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Status"
              name={["PreviousLoan", "Status"]}
              style={formItemStyle}
            >
              <Input readOnly style={formInputStyle} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Divider />
      <Title level={5}>Co-Borrower / Co-Maker Information</Title>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Name"
            name={["CoMaker", "Name"]}
            style={formItemStyle}
          >
            <Input placeholder="Enter co-maker's name" style={formInputStyle} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Contact No."
            name={["CoMaker", "ContactNo"]}
            style={formItemStyle}
          >
            <Input
              placeholder="Enter co-maker's contact number"
              style={formInputStyle}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label="Address"
            name={["CoMaker", "Address"]}
            style={formItemStyle}
          >
            <Input.TextArea rows={2} placeholder="Enter co-maker's address" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Relationship to Client"
            name={["CoMaker", "Relationship"]}
            style={formItemStyle}
          >
            <Input
              placeholder="Enter relationship to client"
              style={formInputStyle}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

// --- Main component to control which form is displayed ---
const Step1_GeneralInfo = ({ form, onValuesChange }) => {
  const [loanType, setLoanType] = useState("New");

  const handleLoanTypeChange = (e) => {
    const newType = e.target.value;
    setLoanType(newType);
    form.resetFields();
    form.setFieldsValue({ LoanType: newType });
  };

  const handleClientSelectForRenewal = async (client) => {
    try {
      const response = await api.get(
        `/loans/client-details-for-renewal/${client.ClientNo}`
      );
      if (response.data.success) {
        const { client: clientData, lastLoan } = response.data.data;

        // ✅ FIX: Access the nested '$date' property for correct parsing
        const dateOfBirth = clientData.DateOfBirth?.$date
          ? dayjs(clientData.DateOfBirth.$date)
          : null;
        const maturityDate = lastLoan?.MaturityDate?.$date
          ? dayjs(lastLoan.MaturityDate.$date)
          : null;

        form.setFieldsValue({
          ...clientData,
          DateOfBirth: dateOfBirth,
          PreviousLoan: {
            Record: lastLoan?.LoanCycleNo,
            Date: maturityDate,
            Amount: lastLoan?.LoanAmount,
            Status: lastLoan?.LoanStatus,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch client details for renewal", error);
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        initialValues={{ LoanType: "New" }}
      >
        {loanType === "New" ? (
          <NewApplicationForm
            form={form}
            handleLoanTypeChange={handleLoanTypeChange}
          />
        ) : (
          <RenewalApplicationForm
            form={form}
            onClientSelect={handleClientSelectForRenewal}
            handleLoanTypeChange={handleLoanTypeChange}
          />
        )}
      </Form>
    </Card>
  );
};

export default Step1_GeneralInfo;
