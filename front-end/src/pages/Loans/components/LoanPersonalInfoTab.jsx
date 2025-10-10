import React from "react";
import {
  Typography,
  Input,
  DatePicker,
  InputNumber,
  Collapse,
  Row,
  Col,
} from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

export default function LoanPersonalInfoTab({
  editedLoan,
  handleChange,
  isEditing,
}) {
  if (!editedLoan) {
    return (
      <div style={{ padding: 16 }}>
        <Text type="secondary">Loading personal information...</Text>
      </div>
    );
  }
  // Merge possible legacy / alternative field locations into a unified `person` object
  const rawPerson = editedLoan?.person || {};
  const person = {
    ...rawPerson,
    // Name fallbacks (support transformed shape or original aggregated projection)
    firstName: rawPerson.firstName || editedLoan?.FirstName || "",
    middleName: rawPerson.middleName || editedLoan?.MiddleName || "",
    lastName: rawPerson.lastName || editedLoan?.LastName || "",
    // Contact fallbacks
    contactNo:
      rawPerson.contactNo ||
      editedLoan?.contact?.contactNumber ||
      editedLoan?.ContactNumber ||
      "",
    alternateContactNo:
      rawPerson.alternateContactNo ||
      editedLoan?.contact?.alternateContactNumber ||
      editedLoan?.AlternateContactNumber ||
      "",
    email:
      rawPerson.email || editedLoan?.contact?.email || editedLoan?.Email || "",
    // Spouse fallbacks
    spouseFirstName:
      rawPerson.spouseFirstName ||
      editedLoan?.spouse?.firstName ||
      editedLoan?.Spouse?.FirstName ||
      "",
    spouseMiddleName:
      rawPerson.spouseMiddleName ||
      editedLoan?.spouse?.middleName ||
      editedLoan?.Spouse?.MiddleName ||
      "",
    spouseLastName:
      rawPerson.spouseLastName ||
      editedLoan?.spouse?.lastName ||
      editedLoan?.Spouse?.LastName ||
      "",
    birthAddress: rawPerson.birthAddress || editedLoan?.BirthAddress || "",
    workAddress: rawPerson.workAddress || editedLoan?.WorkAddress || "",
    civilStatus: rawPerson.civilStatus || editedLoan?.CivilStatus || "",
    gender: rawPerson.gender || editedLoan?.Gender || "",
    dateOfBirth: rawPerson.dateOfBirth || editedLoan?.DateOfBirth || "",
    monthlyIncome:
      rawPerson.monthlyIncome !== undefined
        ? rawPerson.monthlyIncome
        : editedLoan?.MonthlyIncome,
    numberOfChildren:
      rawPerson.numberOfChildren !== undefined
        ? rawPerson.numberOfChildren
        : editedLoan?.NumberOfChildren,
    occupation: rawPerson.occupation || editedLoan?.Occupation || "",
    companyName: rawPerson.companyName || editedLoan?.CompanyName || "",
  };
  // Debug logs to inspect why names might be showing as N/A
  if (process.env.NODE_ENV !== "production" && editedLoan) {
    // Only log when we actually have an editedLoan reference (modal opened)
    // and avoid spamming every render by attaching a small checksum.
    try {
      const checksum = [
        person.firstName,
        person.middleName,
        person.lastName,
      ].join("|");
      if (window.__lastPersonChecksum !== checksum) {
        // // eslint-disable-next-line no-console
        // console.log("[LoanPersonalInfoTab] editedLoan raw:", editedLoan);
        // // eslint-disable-next-line no-console
        // console.log("[LoanPersonalInfoTab] rawPerson:", rawPerson);
        // // eslint-disable-next-line no-console
        // console.log("[LoanPersonalInfoTab] derived person:", person);
        window.__lastPersonChecksum = checksum;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("[LoanPersonalInfoTab] debug logging error", e);
    }
  }
  const address = editedLoan?.address || {};

  const unwrapDate = (val) => {
    if (!val) return val;
    if (typeof val === "object" && val.$date) return val.$date; // Mongo style wrapper
    return val;
  };

  const renderField = (
    label,
    field,
    value,
    type = "text",
    onChangeHandler = handleChange
  ) => {
    if (!isEditing) {
      let displayValue;

      if (value === null || value === undefined || value === "") {
        displayValue = <Text type="secondary">N/A</Text>;
      } else if (type === "date") {
        displayValue = dayjs(value).format("MMMM D, YYYY");
      } else if (type === "number") {
        displayValue = new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(value);
      } else {
        displayValue = value;
      }

      return (
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "normal" }}>{label}</Text>
          <div
            style={{
              padding: "5px 0",
              minHeight: "32px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Text>{displayValue}</Text>
          </div>
        </div>
      );
    }

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
            value={value}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={!isEditing}
            style={{ width: "100%" }}
            size="small"
            formatter={(val) =>
              val ? `₱ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
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

  const items = [
    {
      key: "1",
      label: "Basic Info",
      children: (
        <>
          <Row gutter={16}>
            <Col span={8}>
              {renderField("Last Name", "person.lastName", person?.lastName)}
            </Col>
            <Col span={8}>
              {renderField("First Name", "person.firstName", person?.firstName)}
            </Col>
            <Col span={8}>
              {renderField(
                "Middle Name",
                "person.middleName",
                person?.middleName
              )}
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
                unwrapDate(person?.dateOfBirth),
                "date"
              )}
            </Col>
            <Col span={8}>
              {renderField(
                "Civil Status",
                "person.civilStatus",
                person?.civilStatus
              )}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              {renderField(
                "Monthly Income",
                "person.monthlyIncome",
                person?.monthlyIncome,
                "number"
              )}
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
        </>
      ),
    },
    {
      key: "2",
      label: "Contact Info",
      children: (
        <>
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
        </>
      ),
    },
    {
      key: "3",
      label: "Address Info",
      children: (
        <>
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
          {renderField(
            "Birth Address",
            "person.birthAddress",
            person?.birthAddress
          )}
          {renderField(
            "Work Address",
            "person.workAddress",
            person?.workAddress
          )}
        </>
      ),
    },
    {
      key: "4",
      label: "Spouse Info",
      children: (
        <>
          <Row gutter={16}>
            <Col span={8}>
              {renderField(
                "Spouse Last Name",
                "person.spouseLastName",
                person?.spouseLastName
              )}
            </Col>
            <Col span={8}>
              {renderField(
                "Spouse First Name",
                "person.spouseFirstName",
                person?.spouseFirstName
              )}
            </Col>
            <Col span={8}>
              {renderField(
                "Spouse Middle Name",
                "person.spouseMiddleName",
                person?.spouseMiddleName
              )}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              {renderField(
                "Occupation",
                "person.occupation",
                person?.occupation
              )}
            </Col>
            <Col span={12}>
              {renderField(
                "Company Name",
                "person.companyName",
                person?.companyName
              )}
            </Col>
          </Row>
        </>
      ),
    },
  ];
  return <Collapse defaultActiveKey={["1", "2", "3", "4"]} items={items} />;
}
