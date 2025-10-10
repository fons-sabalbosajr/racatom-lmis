import React, { useState, useEffect } from "react";
import { Card, Select, DatePicker, Button, Space, Typography, Table, message } from "antd";
import api, { API_BASE_URL } from "../../../utils/axios";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const LoanReportGenerator = () => {
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [allLoans, setAllLoans] = useState([]);
  const [selectedLoanCycle, setSelectedLoanCycle] = useState(null);
  const [selectedLoanAccountId, setSelectedLoanAccountId] = useState(null);
  const [dateRange, setDateRange] = useState([]); // [startDate, endDate]
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState(null); // 'statementOfAccount' or 'ledger'
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const fetchAllLoans = async () => {
      setLoadingLoans(true);
      try {
        const res = await api.get("/loans", { params: { limit: 10000 } }); // Fetch all loans
        if (res.data.success) {
          setAllLoans(res.data.data);
        } else {
          message.error("Failed to load loan accounts.");
        }
      } catch (err) {
        console.error("Error fetching all loans:", err);
        message.error("Error fetching loan accounts.");
      } finally {
        setLoadingLoans(false);
      }
    };
    fetchAllLoans();
  }, []);

  const handleLoanCycleChange = (value) => {
    const selected = allLoans.find(loan => loan.loanInfo.loanNo === value);
    if (selected) {
      setSelectedLoanCycle(selected.loanInfo.loanNo);
      setSelectedLoanAccountId(selected.accountId);
      setReportData(null); // Clear previous report
      setReportType(null);
    }
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const generateReport = async (type) => {
    if (!selectedLoanAccountId || !selectedLoanCycle) {
      message.warning("Please select a loan account first.");
      return;
    }

    setReportLoading(true);
    setReportType(type);
    setReportData(null);

    try {
      const params = {
        startDate: dateRange[0] ? dateRange[0].toISOString() : undefined,
        endDate: dateRange[1] ? dateRange[1].toISOString() : undefined,
      };
      const res = await api.get(
        `/loans/report/${type.replace(/([A-Z])/g, '-$1').toLowerCase()}/${selectedLoanAccountId}/${selectedLoanCycle}`,
        { params }
      );

      if (res.data.success) {
        setReportData(res.data.data);
        message.success(`${type === 'statementOfAccount' ? 'Statement of Account' : 'Ledger'} generated successfully.`);
      } else {
        message.error(`Failed to generate ${type === 'statementOfAccount' ? 'Statement of Account' : 'Ledger'}.`);
      }
    } catch (err) {
      console.error(`Error generating ${type} report:`, err);
      message.error(`Error generating ${type === 'statementOfAccount' ? 'Statement of Account' : 'Ledger'}.`);
    } finally {
      setReportLoading(false);
    }
  };

  const exportReportToExcel = (type) => {
    if (!selectedLoanAccountId || !selectedLoanCycle) {
      message.warning("Please select a loan account first.");
      return;
    }

    const params = new URLSearchParams({
      reportType: type,
      accountId: selectedLoanAccountId,
      loanCycleNo: selectedLoanCycle,
    });

    if (dateRange[0]) {
      params.append("startDate", dateRange[0].toISOString());
    }
    if (dateRange[1]) {
      params.append("endDate", dateRange[1].toISOString());
    }

    window.open(
      `${API_BASE_URL}/loans/export/${type.replace(/([A-Z])/g, '-$1').toLowerCase()}?${params.toString()}`,
      "_blank"
    );
  };

  const getReportColumns = () => {
    if (reportType === "statementOfAccount") {
      return [
        { title: "Payment Date", dataIndex: "paymentDate", key: "paymentDate", render: (text) => text ? moment(text).format("YYYY-MM-DD") : "" },
        { title: "Description", dataIndex: "description", key: "description" },
        { title: "Principal Paid", dataIndex: "principalPaid", key: "principalPaid", render: (text) => parseFloat(text).toFixed(2) },
        { title: "Interest Paid", dataIndex: "interestPaid", key: "interestPaid", render: (text) => parseFloat(text).toFixed(2) },
        { title: "Penalty Paid", dataIndex: "penaltyPaid", key: "penaltyPaid", render: (text) => parseFloat(text).toFixed(2) },
        { title: "Total Collected", dataIndex: "totalCollected", key: "totalCollected", render: (text) => parseFloat(text).toFixed(2) },
        { title: "Running Balance", dataIndex: "runningBalance", key: "runningBalance", render: (text) => parseFloat(text).toFixed(2) },
      ];
    } else if (reportType === "ledger") {
      return [
        { title: "Date", dataIndex: "date", key: "date", render: (text) => text ? moment(text).format("YYYY-MM-DD") : "" },
        { title: "Description", dataIndex: "description", key: "description" },
        { title: "Debit", dataIndex: "debit", key: "debit", render: (text) => parseFloat(text).toFixed(2) },
        { title: "Credit", dataIndex: "credit", key: "credit", render: (text) => parseFloat(text).toFixed(2) },
        { title: "Running Balance", dataIndex: "runningBalance", key: "runningBalance", render: (text) => parseFloat(text).toFixed(2) },
      ];
    }
    return [];
  };

  return (
    <Card className="loan-report-generator-card">
      <Title level={4}>Loan Report Generator</Title>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Text>Select Loan Account:</Text>
        <Select
          showSearch
          placeholder="Select a loan account"
          optionFilterProp="children"
          onChange={handleLoanCycleChange}
          loading={loadingLoans}
          style={{ width: "100%" }}
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {allLoans.map((loan) => (
            <Option key={loan._id} value={loan.loanInfo.loanNo}>
              {`${loan.loanInfo.loanNo} - ${loan.fullName}`}
            </Option>
          ))}
        </Select>

        <Text>Select Date Range (Optional):</Text>
        <RangePicker style={{ width: "100%" }} onChange={handleDateRangeChange} />

        <Space>
          <Button
            type="primary"
            onClick={() => generateReport("statementOfAccount")}
            loading={reportLoading && reportType === "statementOfAccount"}
            disabled={!selectedLoanCycle}
          >
            Generate Statement of Account
          </Button>
          <Button
            onClick={() => exportReportToExcel("statementOfAccount")}
            disabled={!selectedLoanCycle}
          >
            Export SOA to Excel
          </Button>
        </Space>

        <Space>
          <Button
            type="primary"
            onClick={() => generateReport("ledger")}
            loading={reportLoading && reportType === "ledger"}
            disabled={!selectedLoanCycle}
          >
            Generate Ledger
          </Button>
          <Button
            onClick={() => exportReportToExcel("ledger")}
            disabled={!selectedLoanCycle}
          >
            Export Ledger to Excel
          </Button>
        </Space>

        {reportData && reportData.loanInfo && (
          <Card style={{ marginTop: 20 }}>
            <Title level={5}>Report Details for {reportData.loanInfo.loanCycleNo}</Title>
            <Text>Client Name: {reportData.loanInfo.clientName}</Text><br/>
            <Text>Account ID: {reportData.loanInfo.accountId}</Text><br/>
            <Text>Loan Type: {reportData.loanInfo.loanType}</Text><br/>
            <Text>Loan Amount: {parseFloat(reportData.loanInfo.loanAmount).toFixed(2)}</Text><br/>
            <Text>Current Balance: {parseFloat(reportData.loanInfo.currentBalance).toFixed(2)}</Text><br/>
            <Text>Start Payment Date: {moment(reportData.loanInfo.startPaymentDate).format("YYYY-MM-DD")}</Text><br/>
            <Text>Maturity Date: {moment(reportData.loanInfo.maturityDate).format("YYYY-MM-DD")}</Text><br/>
          </Card>
        )}

        {reportData && reportData.transactions && reportData.transactions.length > 0 && (
          <Table
            dataSource={reportData.transactions}
            columns={getReportColumns()}
            rowKey={(record, index) => index}
            pagination={false}
            loading={reportLoading}
            style={{ marginTop: 20 }}
            scroll={{ x: 'max-content' }}
          />
        )}

        {reportData && reportData.entries && reportData.entries.length > 0 && (
          <Table
            dataSource={reportData.entries}
            columns={getReportColumns()}
            rowKey={(record, index) => index}
            pagination={false}
            loading={reportLoading}
            style={{ marginTop: 20 }}
            scroll={{ x: 'max-content' }}
          />
        )}

        {reportData && ((reportData.transactions && reportData.transactions.length === 0) || (reportData.entries && reportData.entries.length === 0)) && (
          <Text type="secondary" style={{ marginTop: 20 }}>No transactions found for the selected criteria.</Text>
        )}
      </Space>
    </Card>
  );
};

export default LoanReportGenerator;
