import React from "react";
import { Typography, Input, DatePicker, InputNumber, Collapse, Row, Col } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;
const { Panel } = Collapse;

export default function LoanPersonalInfoTab({ editedLoan, handleChange, isEditing }) {
  const { person, address } = editedLoan || {};

  const renderField = (
    label,
    field,
    value,
    type = "text",
    onChangeHandler = handleChange,
  ) => {
    return (
      <div style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: "normal" }}>{label}</Text>
        {type === "date" ? (
          <DatePicker
            value={value ? dayjs(value) : null}
            onChange={(date) =>
              onChangeHandler(field, date ? date.toISOString() : null)
            }
            disabled={!isEditing}
            style={{ width: "100%" }}
          />
        ) : type === "number" ? (
          <InputNumber
            value={value || 0}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={!isEditing}
            style={{ width: "100%" }}
            size="small"
            formatter={(val) =>
              `₱ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(val) => val.replace(/[^\d.]/g, "")}
          />
        ) : (
          <Input
            value={value || ""}
            onChange={(e) => onChangeHandler(field, e.target.value)}
            disabled={!isEditing}
            size="small"
            style={{ width: "100%", height: 32 }}
            type={type}
          />
        )}
      </div>
    );
  };

  return (
    <Collapse defaultActiveKey={['1', '2', '3', '4']}>
      <Panel header="Basic Info" key="1">
        <Row gutter={16}>
          <Col span={8}>
            {renderField("Last Name", "person.lastName", person?.lastName)}
          </Col>
          <Col span={8}>
            {renderField("First Name", "person.firstName", person?.firstName)}
          </Col>
          <Col span={8}>
            {renderField("Middle Name", "person.middleName", person?.middleName)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            {renderField("Gender", "person.gender", person?.gender)}
          </Col>
          <Col span={8}>
            {renderField(
              "Date of Birth",
              "person.dateOfBirth",
              person?.dateOfBirth,
              "date"
            )}
          </Col>
          <Col span={8}>
            {renderField("Civil Status", "person.civilStatus", person?.civilStatus)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Monthly Income", "person.monthlyIncome", person?.monthlyIncome, "number")}
          </Col>
          <Col span={12}>
            {renderField(
              "No. of Children",
              "person.numberOfChildren",
              person?.numberOfChildren,
              "number"
            )}
          </Col>
        </Row>
      </Panel>
      <Panel header="Contact Info" key="2">
        <Row gutter={16}>
          <Col span={12}>
            {renderField(
              "Contact Number",
              "person.contactNo",
              person?.contactNo
            )}
          </Col>
          <Col span={12}>
            {renderField(
              "Alternate Contact",
              "person.alternateContactNo",
              person?.alternateContactNo
            )}
          </Col>
        </Row>
        {renderField("Email", "person.email", person?.email)}
      </Panel>
      <Panel header="Address Info" key="3">
        <Row gutter={16}>
          <Col span={8}>
            {renderField("Barangay", "address.barangay", address?.barangay)}
          </Col>
          <Col span={8}>
            {renderField("City", "address.city", address?.city)}
          </Col>
          <Col span={8}>
            {renderField("Province", "address.province", address?.province)}
          </Col>
        </Row>
        {renderField("Birth Address", "person.birthAddress", person?.birthAddress)}
        {renderField("Work Address", "person.workAddress", person?.workAddress)}
      </Panel>
      <Panel header="Spouse Info" key="4">
        <Row gutter={16}>
          <Col span={8}>
            {renderField("Spouse Last Name", "person.spouseLastName", person?.spouseLastName)}
          </Col>
          <Col span={8}>
            {renderField("Spouse First Name", "person.spouseFirstName", person?.spouseFirstName)}
          </Col>
          <Col span={8}>
            {renderField("Spouse Middle Name", "person.spouseMiddleName", person?.spouseMiddleName)}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            {renderField("Occupation", "person.occupation", person?.occupation)}
          </Col>
          <Col span={12}>
            {renderField("Company Name", "person.companyName", person?.companyName)}
          </Col>
        </Row>
      </Panel>
    </Collapse>
  );
}
