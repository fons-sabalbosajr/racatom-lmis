// src/pages/Loans.jsx
import React, { useEffect, useState } from "react";
import { Card, Table, Typography, message, Pagination, Select } from "antd";
import api from "../../utils/axios";
import { getLoanColumns } from "./components/LoanColumns";
import LoanFilters from "./components/LoanFilters";
import LoanDetailsModal from "./components/LoanDetailsModal";
import UpdateLoanNoModal from "./components/UpdateLoanNoModal";
import ExportCollectionPDF from "../../utils/ExportCollectionPDF";
import ExportLoanSummaryPDF from "../../utils/ExportLoanSummaryPDF";
import "./loan.css";

import UpdateStatusSummaryModal from "./components/UpdateStatusSummaryModal";
import { useDevSettings } from "../../context/DevSettingsContext";

const { Title } = Typography;

export default function Loans() {
  const { settings } = useDevSettings();
  const [data, setData] = useState([]); // Holds the loans for the current page
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [singleLoanToUpdate, setSingleLoanToUpdate] = useState(null);

  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [loanForStatusUpdate, setLoanForStatusUpdate] = useState(null);

  const [totalLoansNeedingUpdateCount, setTotalLoansNeedingUpdateCount] =
    useState(0);
  const [allLoansNeedingUpdate, setAllLoansNeedingUpdate] = useState([]);
  const [fetchingTotalLoansNeedingUpdate, setFetchingTotalLoansNeedingUpdate] =
    useState(false);

  // filters
  const [q, setQ] = useState("");
  const [loanStatus, setLoanStatus] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentModeLoading, setPaymentModeLoading] = useState(false);

  const [year, setYear] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [yearLoading, setYearLoading] = useState(false);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState("1");
  const [tableParams, setTableParams] = useState({
    current: 1,
    pageSize: 20,
    sorter: {},
  });
  const [tableLoading, setTableLoading] = useState(false);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { field, order } = tableParams.sorter || {};
      const res = await api.get("/loans", {
        params: {
          page: tableParams.current,
          limit: tableParams.pageSize,
          q,
          loanStatus,
          paymentMode,
          year,
          minimal: true,
          sortBy: field || "AccountId",
          sortDir: order === "descend" ? "desc" : "asc",
        },
      });
      if (res.data.success) {
        // Use server-computed fields (collectionStatus, counts) to avoid N+1 requests per row
        const loans = res.data.data || [];
        // Ensure a safe fallback label when collectionStatus is missing
        const normalized = loans.map((loan) => ({
          ...loan,
          collectionStatus: loan.collectionStatus || "No Data Encoded",
        }));

        setData(normalized);
        setMeta(res.data.meta);
      } else {
        message.error("Failed to load loans");
      }
    } catch (err) {
      console.error(err);
      message.error("Error loading loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableParams]);

  const fetchTotalLoansNeedingUpdate = async () => {
    try {
      setFetchingTotalLoansNeedingUpdate(true);
      const res = await api.get("/loans", {
        params: { needsUpdate: true, limit: 10000 },
      });
      if (res.data.success) {
        const loans = res.data.data.filter(
          (loan) => loan.loanInfo?.loanNo && loan.loanInfo.loanNo.includes("-R")
        );
        setAllLoansNeedingUpdate(loans);
        setTotalLoansNeedingUpdateCount(loans.length);
      } else {
        message.error("Failed to fetch total loans needing update");
      }
    } catch (err) {
      console.error("Error fetching total loans needing update:", err);
      message.error("Error fetching total loans needing update");
    } finally {
      setFetchingTotalLoansNeedingUpdate(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      setStatusLoading(true);
      const res = await api.get("/loans/statuses");
      if (res.data.success) {
        setStatusOptions(res.data.data);
      }
    } catch (err) {
      message.error("Failed to load loan statuses");
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchPaymentModes = async () => {
    try {
      setPaymentModeLoading(true);
      const res = await api.get("/loans/payment-modes");
      if (res.data.success) {
        const filteredPaymentModes = res.data.data.filter(
          (mode) => mode !== null && mode !== undefined && mode !== ""
        );
        setPaymentModeOptions(filteredPaymentModes);
      }
    } catch (err) {
      message.error("Failed to load payment modes");
    } finally {
      setPaymentModeLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      setYearLoading(true);
      try {
        const res = await api.get("/loans/years");
        if (res.data.success) {
          const years = res.data.data || [];
          setYearOptions(years);
        }
      } catch (err) {
        console.error("Failed to fetch loan years", err);
      }
      setYearLoading(false);
      fetchStatuses();
      fetchPaymentModes();
      fetchTotalLoansNeedingUpdate();
    };

    initialLoad();
  }, []);

  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      current: pagination.current,
      pageSize: pagination.pageSize,
      sorter,
    });
  };

  const handleSearch = () => {
    setTableParams((prev) => ({
      ...prev,
      current: 1, // reset to first page
    }));
    fetchLoans();
  };

  const viewLoan = async (record, initialTab = "1") => {
    try {
      setIsModalLoading(true);
      setModalInitialTab(initialTab);
      const [loansRes, docsRes] = await Promise.all([
        api.get(`/loans/account/${record.accountId}`),
        api.get(
          `/loans/client/${
            record.clientNo || record.loanInfo?.clientNo
          }/documents`
        ),
      ]);

      if (loansRes.data.success && docsRes.data.success) {
        const currentLoan = loansRes.data.data.find(
          (loan) => loan._id === record._id
        );

        if (currentLoan) {
          const combinedLoanData = {
            ...currentLoan,
            person: record.person,
            address: record.address,
            allClientLoans: loansRes.data.data,
            clientDocuments: docsRes.data.data,
          };
          setSelectedLoan(combinedLoanData);
          setModalVisible(true);
        } else {
          message.error("Loan details not found.");
        }
      } else {
        message.error("Failed to fetch loan details.");
      }
    } catch (err) {
      console.error("Error fetching loan details:", err);
      message.error("Error fetching loan details.");
    } finally {
      setIsModalLoading(false);
    }
  };

  const viewCollectionSummary = (record) => {
    viewLoan(record, "4");
  };

  const generateStatementOfAccount = async (record) => {
    try {
      message.loading({ content: "Generating PDF...", key: "pdf" });
      const res = await api.get(`/loan-collections/${record.loanInfo.loanNo}`, {
        params: { limit: 0 },
      });
      if (res.data.success) {
        if (res.data.data && res.data.data.length > 0) {
          ExportCollectionPDF(record, res.data.data);
          message.success({
            content: "PDF Generated!",
            key: "pdf",
            duration: 2,
          });
        } else {
          message.info({
            content: "No collections found for this account.",
            key: "pdf",
            duration: 3,
          });
        }
      } else {
        message.error({
          content: "Failed to fetch collection data.",
          key: "pdf",
        });
      }
    } catch (error) {
      console.error("Error generating statement of account:", error);
      message.error({ content: "Failed to generate PDF.", key: "pdf" });
    }
  };

  const generateLoanSummary = (record) => {
    try {
      message.loading({ content: "Generating PDF...", key: "pdf" });
      ExportLoanSummaryPDF(record);
      message.success({ content: "PDF Generated!", key: "pdf", duration: 2 });
    } catch (error) {
      console.error("Error generating loan summary:", error);
      message.error({ content: "Failed to generate PDF.", key: "pdf" });
    }
  };

  const onUpdateSingleLoan = (record) => {
    setSingleLoanToUpdate(record);
    setIsUpdateModalVisible(true);
  };

  const handleUpdateStatus = (loan) => {
    setLoanForStatusUpdate(loan);
    setIsStatusModalVisible(true);
  };

  const refreshSelectedLoan = async () => {
    fetchLoans();
    if (selectedLoan) {
      try {
        setIsModalLoading(true);
        const [loansRes, docsRes] = await Promise.all([
          api.get(`/loans/account/${selectedLoan.accountId}`),
          api.get(`/loans/client/${selectedLoan.clientNo}/documents`),
        ]);

        if (loansRes.data.success && docsRes.data.success) {
          const currentLoan = loansRes.data.data.find(
            (loan) => loan._id === selectedLoan._id
          );

          if (currentLoan) {
            const combinedLoanData = {
              ...currentLoan,
              person: selectedLoan.person,
              address: selectedLoan.address,
              allClientLoans: loansRes.data.data,
              clientDocuments: docsRes.data.data,
            };
            setSelectedLoan(combinedLoanData);
          } else {
            setModalVisible(false);
            message.info("The selected loan details may have been updated.");
          }
        } else {
          message.error("Failed to refresh client data.");
        }
      } catch (err) {
        console.error("Error refreshing client data:", err);
        message.error("Error refreshing client data.");
      } finally {
        setIsModalLoading(false);
      }
    }
  };

  let columns = getLoanColumns({
    viewLoan,
    onUpdateSingleLoan,
    viewCollectionSummary,
    generateStatementOfAccount,
    generateLoanSummary,
    onUpdateStatus: handleUpdateStatus,
  });

  if (!settings.showStatusSummary) {
    columns = columns.filter((c) => c.key !== "status");
  }

  const exportExcel = async () => {
    try {
      setTableLoading(true);
      const params = {
        q,
        loanStatus,
        paymentMode,
        year,
        sortBy: tableParams.sorter?.field || "AccountId",
        sortDir: tableParams.sorter?.order === "descend" ? "desc" : "asc",
      };

      const response = await api.get("/loans/export", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `loans_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success("Excel export completed!");
    } catch (err) {
      console.error("Error exporting Excel:", err);
      message.error("Failed to export Excel.");
    } finally {
      setTableLoading(false);
    }
  };

  return (
    <Card className="loan-card">
      <Title level={3} style={{ marginTop: -10 }}>
        Loan Account Management
      </Title>

      <LoanFilters
        q={q}
        loanStatus={loanStatus}
        paymentMode={paymentMode}
        year={year}
        setQ={setQ}
        setLoanStatus={setLoanStatus}
        setPaymentMode={setPaymentMode}
        setYear={setYear}
        handleSearch={handleSearch}
        statusOptions={statusOptions}
        paymentModeOptions={paymentModeOptions}
        yearOptions={yearOptions}
        statusLoading={statusLoading}
        paymentModeLoading={paymentModeLoading}
        yearLoading={yearLoading}
        tableLoading={loading}
        loansNeedingUpdateCount={totalLoansNeedingUpdateCount}
        onViewUpdateLoans={() => {
          setSingleLoanToUpdate(null);
          setIsUpdateModalVisible(true);
        }}
        exportExcel={exportExcel}
      />

      <Table
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        onChange={handleTableChange}
        scroll={{ x: 1100 }}
        className="loan-table corporate-table"
        rowClassName={(record) =>
          record.loanInfo?.loanNo && record.loanInfo.loanNo.includes("-R")
            ? "loan-needs-update"
            : ""
        }
        footer={() => (
          <div
            style={{ display: "flex", alignItems: "center", padding: "10px 0" }}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <Typography.Text italic>
                Total Loan Accounts: {meta.total}
              </Typography.Text>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <Pagination
                current={meta.page}
                pageSize={meta.limit}
                total={meta.total}
                onChange={(page, pageSize) =>
                  handleTableChange({ current: page, pageSize }, {}, {})
                }
                showSizeChanger={false}
                showTotal={false}
              />
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <Select
                value={meta.limit}
                onChange={(value) =>
                  handleTableChange({ current: 1, pageSize: value }, {}, {})
                }
                style={{ width: 120 }}
              >
                <Select.Option value={10}>10 / page</Select.Option>
                <Select.Option value={20}>20 / page</Select.Option>
                <Select.Option value={50}>50 / page</Select.Option>
                <Select.Option value={100}>100 / page</Select.Option>
              </Select>
            </div>
          </div>
        )}
      />

      <LoanDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        loan={selectedLoan}
        loading={isModalLoading}
        onLoanUpdate={refreshSelectedLoan}
        initialTabKey={modalInitialTab}
      />

      <UpdateLoanNoModal
        visible={isUpdateModalVisible}
        onCancel={() => {
          setIsUpdateModalVisible(false);
          setSingleLoanToUpdate(null);
        }}
        loansToUpdate={
          singleLoanToUpdate ? [singleLoanToUpdate] : allLoansNeedingUpdate
        }
        onLoanUpdated={() => {
          fetchLoans();
          fetchTotalLoansNeedingUpdate();
          if (selectedLoan) {
            refreshSelectedLoan();
          }
        }}
      />

      <UpdateStatusSummaryModal
        visible={isStatusModalVisible}
        loan={loanForStatusUpdate}
        onClose={() => setIsStatusModalVisible(false)}
        onSuccess={() => {
          setIsStatusModalVisible(false);
          fetchLoans();
        }}
      />
    </Card>
  );
}
