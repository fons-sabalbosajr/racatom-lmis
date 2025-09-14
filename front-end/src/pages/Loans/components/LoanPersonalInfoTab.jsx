import React from "react";
import { Typography, Input, DatePicker, InputNumber, Divider, Row, Col } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

export default function LoanPersonalInfoTab({ editedLoan, handleChange }) {
  const renderField = (
    label,
    field,
    value,
    type = "text",
    onChangeHandler = handleChange,
    disabled = false
  ) => {
    return (
      <div style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: "normal" }}>{label}</Text>
        {type === "date" ? (
          <DatePicker
            value={value ? dayjs(value) : null}
            onChange={(date) =>
              onChangeHandler(field, date ? date.format("YYYY-MM-DD") : null)
            }
            disabled={disabled}
            style={{ width: "100%" }}
          />
        ) : type === "number" ? (
          <InputNumber
            value={value || 0}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={disabled}
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
            disabled={disabled}
            size="small"
            style={{ width: "100%", height: 32 }}
            type={type}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <Divider orientation="left">Basic Info</Divider>
      <Row gutter={16}>
        <Col span={8}>
          {renderField("Last Name", "LastName", editedLoan?.LastName)}
        </Col>
        <Col span={8}>
          {renderField("First Name", "FirstName", editedLoan?.FirstName)}
        </Col>
        <Col span={8}>
          {renderField(
            "Middle Name",
            "MiddleName",
            editedLoan?.MiddleName
          )}
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          {renderField("Gender", "Gender", editedLoan?.Gender)}
        </Col>
        <Col span={8}>
          {renderField(
            "Date of Birth",
            "DateOfBirth",
            editedLoan?.DateOfBirth,
            "date"
          )}
        </Col>
        <Col span={8}>
          {renderField(
            "Civil Status",
            "CivilStatus",
            editedLoan?.CivilStatus
          )}
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          {renderField(
            "Monthly Income",
            "MonthlyIncome",
            editedLoan?.MonthlyIncome
          )}
        </Col>
        <Col span={12}>
          {renderField(
            "No. of Children",
            "NumberOfChildren",
            editedLoan?.NumberOfChildren
          )}
        </Col>
      </Row>

      <Divider orientation="left">Contact Info</Divider>
      <Row gutter={16}>
        <Col span={12}>
          {renderField(
            "Contact Number",
            "contact.contactNumber",
            editedLoan?.contact?.contactNumber
          )}
        </Col>
        <Col span={12}>
          {renderField(
            "Alternate Contact",
            "contact.alternateContactNumber",
            editedLoan?.contact?.alternateContactNumber
          )}
        </Col>
      </Row>
      {renderField("Email", "contact.email", editedLoan?.contact?.email)}

      <Divider orientation="left">Address Info</Divider>
      <Row gutter={16}>
        <Col span={8}>
          {renderField(
            "Barangay",
            "address.barangay",
            editedLoan?.address?.barangay
          )}
        </Col>
        <Col span={8}>
          {renderField("City", "address.city", editedLoan?.address?.city)}
        </Col>
        <Col span={8}>
          {renderField(
            "Province",
            "address.province",
            editedLoan?.address?.province
          )}
        </Col>
      </Row>
      {renderField(
        "Birth Address",
        "BirthAddress",
        editedLoan?.BirthAddress
      )}
      {renderField(
        "Work Address",
        "WorkAddress",
        editedLoan?.WorkAddress
      )}

      <Divider orientation="left">Spouse Info</Divider>
      <Row gutter={16}>
        <Col span={8}>
          {renderField(
            "Spouse Last Name",
            "SpouseLastName",
            editedLoan?.SpouseLastName
          )}
        </Col>
        <Col span={8}>
          {renderField(
            "Spouse First Name",
            "SpouseFirstName",
            editedLoan?.SpouseFirstName
          )}
        </Col>
        <Col span={8}>
          {renderField(
            "Spouse Middle Name",
            "SpouseMiddleName",
            editedLoan?.SpouseMiddleName
          )}
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          {renderField(
            "Occupation",
            "Occupation",
            editedLoan?.Occupation
          )}
        </Col>
        <Col span={12}>
          {renderField(
            "Company Name",
            "CompanyName",
            editedLoan?.CompanyName
          )}
        </Col>
      </Row>
    </>
  );
}
