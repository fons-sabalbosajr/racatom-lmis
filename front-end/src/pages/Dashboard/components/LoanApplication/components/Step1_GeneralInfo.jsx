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
} from "antd";
import moment from "moment";
import api from "../../../../../utils/axios";

const { Title } = Typography;
const { Option } = AutoComplete;

const formItemStyle = { marginBottom: 8 };

const NewApplicationForm = ({ form }) => {
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

  const handleAgeCalculation = (date, dateString) => {
    if (date) {
      const age = moment().diff(date, "years");
      form.setFieldsValue({ Age: age });
    }
  };

  return (
    <>
      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Client Information
      </Title>
      <Row gutter={8}>
        <Col xs={24} sm={8}>
          <Form.Item name="AccountId" label="Account ID" style={formItemStyle}>
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={8}>
          <Form.Item
            name="FirstName"
            label="First Name"
            rules={[{ required: true }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="MiddleName"
            label="Middle Name"
            style={formItemStyle}
          >
            <Input placeholder="Enter middle name" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="LastName"
            label="Last Name"
            rules={[{ required: true }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={8}>
          <Form.Item
            name="NameSuffix"
            label="Name Suffix"
            style={formItemStyle}
          >
            <Input placeholder="e.g., Jr., Sr., III" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="DateOfBirth" label="Birthday" style={formItemStyle}>
            <DatePicker
              size="large"
              style={{ width: "100%" }}
              onChange={handleAgeCalculation}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="Age" label="Age" style={formItemStyle}>
            <InputNumber size="large" disabled style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={8}>
          <Form.Item
            name="ContactNo"
            label="Contact No."
            rules={[{ required: true }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter contact number" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="AlternateContactNo"
            label="Alternate Contact No."
            style={formItemStyle}
          >
            <Input placeholder="Enter alternate contact number" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="Email"
            label="Email Address"
            rules={[{ type: "email" }]}
            style={formItemStyle}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24}>
          <Form.Item
            name="CurrentAddress"
            label="Current Address"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} placeholder="Enter current address" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item name="Occupation" label="Occupation" style={formItemStyle}>
            <Input placeholder="Enter occupation" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="OccupationAddress"
            label="Occupation Address"
            style={formItemStyle}
          >
            <Input placeholder="Enter occupation address" />
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
          <Row gutter={8}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={["PreviousLoan", "Record"]}
                label="Last Loan Record"
                style={formItemStyle}
              >
                <Input size="small" placeholder="Enter last loan record" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={["PreviousLoan", "Date"]}
                label="Date"
                style={formItemStyle}
              >
                <DatePicker size="large" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={["PreviousLoan", "Amount"]}
                label="Amount"
                style={formItemStyle}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="Enter amount"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={["PreviousLoan", "Status"]}
                label="Status"
                style={formItemStyle}
              >
                <Input size="small" placeholder="Enter status" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )}

      <Divider style={{ margin: "12px 0" }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Co-Borrower / Co-Maker Information
      </Title>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={["CoMaker", "Name"]}
            label="Name"
            style={formItemStyle}
          >
            <Input placeholder="Enter co-maker's name" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={["CoMaker", "ContactNo"]}
            label="Contact No."
            style={formItemStyle}
          >
            <Input placeholder="Enter co-maker's contact number" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24}>
          <Form.Item
            name={["CoMaker", "Address"]}
            label="Address"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} placeholder="Enter co-maker's address" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={["CoMaker", "Relationship"]}
            label="Relationship to Client"
            style={formItemStyle}
          >
            <Input placeholder="Enter relationship to client" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

const RenewalApplicationForm = ({ form, onClientSelect }) => {
  const [searching, setSearching] = useState(false);
  const [clients, setClients] = useState([]);
  const [approvedClients, setApprovedClients] = useState([]);

  useEffect(() => {
    const fetchApprovedClients = async () => {
      try {
        const response = await api.get("/loans/approved-clients");
        if (response.data.success) {
          setApprovedClients(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch approved clients", error);
      }
    };
    fetchApprovedClients();
  }, []);

  const handleSearch = async (value) => {
    if (value) {
      setSearching(true);
      try {
        const response = await api.get(`/loans/search-clients?q=${value}`);
        if (response.data.success) {
          setClients(response.data.data);
        }
      } catch (error) {
        console.error("Error searching clients", error);
      }
      setSearching(false);
    } else {
      setClients([]);
    }
  };

  const onSelect = (value, option) => {
    onClientSelect(option.client);
  };

  const options = (clients.length ? clients : approvedClients).map((client) => (
    <Option
      key={client.ClientNo}
      value={`${client.FirstName} ${client.LastName} (${client.AccountId})`}
      client={client}
    >
      {`${client.FirstName} ${client.LastName} (${client.AccountId})`}
    </Option>
  ));

  return (
    <>
      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Search Existing Client
      </Title>
      <AutoComplete
        style={{ width: "100%" }}
        onSearch={handleSearch}
        onSelect={onSelect}
        placeholder="Search by name or Account ID"
        notFoundContent={searching ? <Spin size="small" /> : "No client found"}
      >
        {options}
      </AutoComplete>

      <Divider />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Client Information
      </Title>
      <Row gutter={8}>
        <Col xs={24} sm={6}>
          <Form.Item name="FirstName" label="First Name" style={formItemStyle}>
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={6}>
          <Form.Item
            name="MiddleName"
            label="Middle Name"
            style={formItemStyle}
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={6}>
          <Form.Item name="LastName" label="Last Name" style={formItemStyle}>
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={6}>
          <Form.Item name="NameSuffix" label="Suffix" style={formItemStyle}>
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item name="ContactNo" label="Contact No." style={formItemStyle}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="AlternateContactNo"
            label="Alternate Contact No."
            style={formItemStyle}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24}>
          <Form.Item
            name="CurrentAddress"
            label="Current Address"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="Email"
            label="Email Address"
            rules={[{ type: "email" }]}
            style={formItemStyle}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="Occupation" label="Occupation" style={formItemStyle}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24}>
          <Form.Item
            name="OccupationAddress"
            label="Occupation Address"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>

      <Card
        size="small"
        title="Previous Loan Details"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={8}>
          <Col xs={24} sm={12}>
            <Form.Item
              name={["PreviousLoan", "Record"]}
              label="Last Loan Record"
              style={formItemStyle}
            >
              <Input size="small" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name={["PreviousLoan", "Date"]}
              label="Date"
              style={formItemStyle}
            >
              <DatePicker style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col xs={24} sm={12}>
            <Form.Item
              name={["PreviousLoan", "Amount"]}
              label="Amount"
              style={formItemStyle}
            >
              <InputNumber style={{ width: "100%" }} disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name={["PreviousLoan", "Status"]}
              label="Status"
              style={formItemStyle}
            >
              <Input size="small" disabled />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Divider style={{ margin: "12px 0" }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Co-Borrower / Co-Maker Information
      </Title>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={["CoMaker", "Name"]}
            label="Name"
            style={formItemStyle}
          >
            <Input placeholder="Enter co-maker's name" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={["CoMaker", "ContactNo"]}
            label="Contact No."
            style={formItemStyle}
          >
            <Input placeholder="Enter co-maker's contact number" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24}>
          <Form.Item
            name={["CoMaker", "Address"]}
            label="Address"
            style={formItemStyle}
          >
            <Input.TextArea rows={2} placeholder="Enter co-maker's address" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={["CoMaker", "Relationship"]}
            label="Relationship to Client"
            style={formItemStyle}
          >
            <Input placeholder="Enter relationship to client" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

const Step1_GeneralInfo = ({ form, onValuesChange }) => {
  const [loanType, setLoanType] = useState("New");

  const handleLoanTypeChange = (e) => {
    const newLoanType = e.target.value;
    setLoanType(newLoanType);
    form.resetFields();
    form.setFieldsValue({ LoanType: newLoanType });
  };

  const handleClientSelectForRenewal = async (client) => {
    try {
      const response = await api.get(
        `/loans/client-details-for-renewal/${client.ClientNo}`
      );
      if (response.data.success) {
        const { client: clientData, lastLoan } = response.data.data;
        form.setFieldsValue({
          ...clientData,
          PreviousLoan: {
            Record: lastLoan?.LoanCycleNo,
            Date: lastLoan ? moment(lastLoan.MaturityDate) : null,
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
    <Card title="Step 1: General Information" bordered={false}>
      <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
        <Form.Item label="Loan Type" name="LoanType" initialValue="New">
          <Radio.Group onChange={handleLoanTypeChange}>
            <Radio value="New">New Application</Radio>
            <Radio value="Renewal">Renewal</Radio>
          </Radio.Group>
        </Form.Item>
        <Divider />
        {loanType === "New" ? (
          <NewApplicationForm form={form} />
        ) : (
          <RenewalApplicationForm
            form={form}
            onClientSelect={handleClientSelectForRenewal}
          />
        )}
      </Form>
    </Card>
  );
};

export default Step1_GeneralInfo;
