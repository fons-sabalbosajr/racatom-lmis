import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Steps,
  Button,
  Form,
  Descriptions,
  Card,
  Typography,
  List,
  Tag,
} from "antd";

import Step1_GeneralInfo from "./components/Step1_GeneralInfo";
import Step2_DocumentRequirements from "./components/Step2_DocumentRequirements";
import Step3_LoanInfo from "./components/Step3_LoanInfo";
import dayjs from "dayjs";
import { swalMessage } from "../../../../utils/swal";
import { SendOutlined } from "@ant-design/icons";

const { Step } = Steps;
const { Title, Text } = Typography;

const LoanApplication = ({
  visible,
  onClose,
  api,
  loanRates = [],
  mode = "create",
  initialData,
}) => {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState({});
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [routingToManager, setRoutingToManager] = useState(false);

  useEffect(() => {
    if (visible && initialData) {
      // Strip MongoDB / admin-only fields before populating the form
      const {
        _id, __v, createdAt, updatedAt,
        RejectedAt, RejectionReason, LoanStatus, IsArchived,
        ...cleanData
      } = initialData;

      // Convert date strings to dayjs for DatePicker compatibility
      if (cleanData.DateOfBirth) {
        cleanData.DateOfBirth = dayjs(cleanData.DateOfBirth);
      }
      if (cleanData.PreviousLoan?.Date) {
        cleanData.PreviousLoan = {
          ...cleanData.PreviousLoan,
          Date: dayjs(cleanData.PreviousLoan.Date),
        };
      }

      form.setFieldsValue(cleanData);
      setFormData(cleanData);
    } else if (!visible) {
      // Reset form and state when modal is closed
      form.resetFields();
      setCurrent(0);
      setFormData({});
    }
  }, [visible, initialData, form]);

  const handleValuesChange = useCallback((changedValues, allValues) => {
    setFormData((prevData) => ({ ...prevData, ...allValues }));
  }, []);

  const stepTitles = [
    "General Information",
    "Document Requirements",
    "Loan Information",
    "Review & Submit",
  ];

  const next = () => {
    form
      .validateFields()
      .then(() => {
        setCurrent(current + 1);
      })
      .catch(() => {
        // Step 2 is optional, so allow skipping
        if (current === 1) {
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

      if (mode === "reapply" && initialData?._id) {
        await api.patch(
          `/loan_clients_application/${initialData._id}/reapply`,
          finalData
        );
        swalMessage.success("Reapplication submitted successfully!");
      } else {
        await api.post(`/loans/loan_clients_application`, finalData);
        swalMessage.success("Loan application submitted successfully!");
      }
      onClose();
    } catch (err) {
      console.error("Submit failed", err);
      const errorMessage =
        err.response?.data?.message || "Failed to submit application";
      swalMessage.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAndRoute = async () => {
    setRoutingToManager(true);
    try {
      const values = await form.getFieldsValue(true);
      const finalData = { ...formData, ...values };

      let appId;
      if (mode === "reapply" && initialData?._id) {
        const res = await api.patch(
          `/loan_clients_application/${initialData._id}/reapply`,
          finalData
        );
        appId = res.data?.data?._id || initialData._id;
      } else {
        const res = await api.post(`/loans/loan_clients_application`, finalData);
        appId = res.data?.data?._id;
      }

      if (!appId) {
        swalMessage.warning("Application created but could not route — no application ID returned.");
        onClose();
        return;
      }

      // Find the Manager from staff users
      const staffRes = await api.get("/messages/staff-users");
      const manager = (staffRes.data.users || []).find(
        (u) => String(u.Position || "").toLowerCase() === "manager"
      );

      if (!manager) {
        swalMessage.warning("Application created but no Manager account found to route to.");
        onClose();
        return;
      }

      // Route the loan application to the Manager
      const formDataRoute = new FormData();
      formDataRoute.append("subject", `Loan Application - ${finalData.FirstName || ""} ${finalData.LastName || ""}`);
      formDataRoute.append("body", "A new loan application has been submitted and routed for your review.");
      formDataRoute.append("loanApplicationId", appId);
      formDataRoute.append("recipients", manager._id);

      await api.post("/messages/route-loan", formDataRoute, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      swalMessage.success("Loan application submitted and routed to Manager!");
      onClose();
    } catch (err) {
      console.error("Submit & route failed", err);
      const errorMessage =
        err.response?.data?.message || "Failed to submit and route application";
      swalMessage.error(errorMessage);
    } finally {
      setRoutingToManager(false);
    }
  };

  const renderValue = (value) => {
    if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "object" && value !== null) {
      return (
        <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "12px" }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return value ?? "-";
  };

  const renderReview = () => {
    const allValues = form.getFieldsValue(true);
    const finalData = { ...formData, ...allValues };

    const step1Complete =
      finalData.FirstName && finalData.LastName && finalData.ContactNo;
    const step2Complete = finalData.UploadedDocs?.length > 0;
    const step3Complete = finalData.LoanAmount && finalData.LoanTerms;

    const step1Fields = [
      "AccountId",
      "LoanType",
      "FirstName",
      "MiddleName",
      "LastName",
      "NameSuffix",
      "DateOfBirth",
      "Age",
      "ContactNo",
      "AlternateContactNo",
      "Email",
      "CurrentAddress",
      "Occupation",
      "OccupationAddress",
      "LoanRecord",
      "PreviousLoan",
      "CoMaker",
    ];
    const step3Fields = [
      "LoanAmount",
      "LoanTerms",
      "PaymentMode",
      "Processing Fee",
      "Loan to be Disbursed",
      "Interest Rate/Month",
      "Penalty Rate",
      "Amortization",
      "Total Loan to be Paid",
    ];

    return (
      <Card title="Review Application Details" size="small">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Title level={5} style={{ margin: 0 }}>
            Step 1: General Information
          </Title>
          <Tag color={step1Complete ? "green" : "red"}>
            {step1Complete ? "Completed" : "Incomplete"}
          </Tag>
        </div>
        <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
          {step1Fields.map((field) => (
            <Descriptions.Item label={field} key={field}>
              {renderValue(finalData[field])}
            </Descriptions.Item>
          ))}
        </Descriptions>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            Step 2: Document Requirements
          </Title>
          <Tag color={step2Complete ? "green" : "orange"}>
            {step2Complete ? "Completed" : "Skipped"}
          </Tag>
        </div>
        <Card size="small" bordered style={{ marginTop: 8 }}>
          {finalData.UploadedDocs?.length ? (
            <List
              size="small"
              header={
                <Text strong>
                  {finalData.UploadedDocs.length} file(s) uploaded
                </Text>
              }
              dataSource={finalData.UploadedDocs}
              renderItem={(file) => (
                <List.Item>{file.name || file.filename}</List.Item>
              )}
            />
          ) : (
            <Text type="secondary">No files uploaded.</Text>
          )}
        </Card>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            Step 3: Loan Information
          </Title>
          <Tag color={step3Complete ? "green" : "red"}>
            {step3Complete ? "Completed" : "Incomplete"}
          </Tag>
        </div>
        <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
          {step3Fields.map((field) => (
            <Descriptions.Item label={field} key={field}>
              {renderValue(finalData[field])}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    );
  };

  // ✅ FIX: Conditionally render step content instead of storing components in an array
  const renderStepContent = () => {
    switch (current) {
      case 0:
        return (
          <Step1_GeneralInfo form={form} onValuesChange={handleValuesChange} />
        );
      case 1:
        return (
          <Step2_DocumentRequirements
            onUploadChange={(fileList) =>
              setFormData({ ...formData, UploadedDocs: fileList })
            }
          />
        );
      case 2:
        return (
          <Step3_LoanInfo
            form={form}
            onValuesChange={handleValuesChange}
            loanRates={loanRates}
          />
        );
      case 3:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      title={mode === "reapply" ? "Reapply Loan Application" : "New Loan Application"}
      onCancel={onClose}
      footer={null}
      width={1000}
      centered
    >
      <Steps current={current} style={{ margin: "24px 0" }}>
        {stepTitles.map((title) => (
          <Step key={title} title={title} />
        ))}
      </Steps>

      <div
        className="steps-content"
        style={{ marginTop: "24px", minHeight: 400 }}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          // Using component={false} prevents the <form> DOM element from re-rendering
          // and losing state when you switch between steps.
          component={false}
        >
          {renderStepContent()}
        </Form>
      </div>

      <div
        className="steps-action"
        style={{ marginTop: "24px", textAlign: "right" }}
      >
        {current > 0 && (
          <Button style={{ margin: "0 8px" }} onClick={prev}>
            Previous
          </Button>
        )}
        {current < stepTitles.length - 1 && (
          <Button type="primary" onClick={next}>
            Next
          </Button>
        )}
        {current === stepTitles.length - 1 && (
          <>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Submit Application
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmitAndRoute}
              loading={routingToManager}
              style={{ marginLeft: 8, background: "#52c41a", borderColor: "#52c41a" }}
            >
              Submit &amp; Route to Manager
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default LoanApplication;
