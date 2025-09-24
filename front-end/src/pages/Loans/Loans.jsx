// src/pages/Loans.jsx
import React, { useEffect, useState } from "react";
import { Card, Table, Typography, message, Pagination, Select } from "antd";
import api from "../../utils/axios";
import { getLoanColumns } from "./components/LoanColumns";
import LoanFilters from "./components/LoanFilters";
import LoanDetailsModal from "./components/LoanDetailsModal";
import UpdateLoanNoModal from "./components/UpdateLoanNoModal"; // New import
import "./loan.css";

const { Title } = Typography;

export default function Loans() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [singleLoanToUpdate, setSingleLoanToUpdate] = useState(null); // For single loan update from table

  // States for total loans needing update (for the warning)
  const [totalLoansNeedingUpdateCount, setTotalLoansNeedingUpdateCount] =
    useState(0);
  const [allLoansNeedingUpdate, setAllLoansNeedingUpdate] = useState([]);
  const [fetchingTotalLoansNeedingUpdate, setFetchingTotalLoansNeedingUpdate] =
    useState(false);

  // filters
  const [q, setQ] = useState("");
  const [loanStatus, setLoanStatus] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [statusOptions, setStatusOptions] = useState([]); // <-- all statuses
  const [paymentModeOptions, setPaymentModeOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentModeLoading, setPaymentModeLoading] = useState(false);

  const [year, setYear] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [yearLoading, setYearLoading] = useState(false);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [tableParams, setTableParams] = useState({
    current: 1,
    pageSize: 20,
    sorter: {},
  });

  // 🔹 Fetch loans (paginated, filtered)
  const fetchLoans = async (params = {}) => {
    try {
      setLoading(true);
      const res = await api.get("/loans", {
        params: {
          page: params.page || tableParams.current,
          limit: params.limit || tableParams.pageSize,
          q: params.q ?? q,
          loanStatus: params.loanStatus ?? loanStatus,
          paymentMode: params.paymentMode ?? paymentMode,
          year: params.year ?? year, // ✅ include year filter
          sortBy: params.sortBy || "AccountId",
          sortDir: params.sortDir || "asc",
        },
      });

      if (res.data.success) {
        setData(res.data.data);
        setMeta(res.data.meta);
        // loansNeedingUpdateCount is now handled by a separate useEffect
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

  // 🔹 Fetch total count of loans needing update (for the warning)
  const fetchTotalLoansNeedingUpdate = async () => {
    try {
      setFetchingTotalLoansNeedingUpdate(true);
      // Assuming an API endpoint or parameter to get all loans needing update
      const res = await api.get("/loans", {
        params: { needsUpdate: true, limit: 10000 },
      }); // Adjust limit as needed or use a dedicated endpoint
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

  // fetch statuses
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

  // fetch payment modes
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
    // 🔹 Initial data load
    const initialLoad = async () => {
      // First, get available years to find the latest one.
      setYearLoading(true);
      try {
        const res = await api.get("/loans/years");
        if (res.data.success) {
          const years = res.data.data || [];
          setYearOptions(years);
          // Do NOT set a default year here. Let it be unfiltered initially.
          // The user can select a year from the dropdown.
          fetchLoans({ page: 1 }); // Fetch all loans initially
        } else {
          // Fallback if no years are returned
          fetchLoans({ page: 1 });
        }
      } catch (err) {
        console.error("Failed to fetch loan years", err);
      }
      setYearLoading(false);
      // Fetch other dropdown options concurrently
      fetchStatuses();
      fetchPaymentModes();
      fetchTotalLoansNeedingUpdate(); // Fetch total count for warning
    };

    initialLoad();
  }, []);

  const handleTableChange = (pagination, filters, sorter) => {
    const sortBy = sorter.field || "accountId"; // ✅ fall back to AccountId
    const sortDir = sorter.order === "ascend" ? "asc" : "desc";

    setTableParams({
      current: pagination.current,
      pageSize: pagination.pageSize,
      sorter,
    });

    fetchLoans({
      page: pagination.current,
      limit: pagination.pageSize,
      sortBy,
      sortDir,
    });
  };

  const handleSearch = (overrides = {}) => {
    fetchLoans({
      page: 1,
      q: overrides.q ?? q,
      loanStatus: overrides.loanStatus ?? loanStatus,
      paymentMode: overrides.paymentMode ?? paymentMode,
      year: overrides.year ?? year, // ✅ Pass year on search
    });
  };

  const viewLoan = async (record) => {
    try {
      setIsModalLoading(true);

      // Fetch full details for this loan
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

  const onUpdateSingleLoan = (record) => {
    setSingleLoanToUpdate(record);
    setIsUpdateModalVisible(true);
  };

  const deleteLoan = async (id) => {
    try {
      await api.delete(`/loans/${id}`);
      message.success("Deleted");
      fetchLoans({ page: tableParams.current });
      fetchTotalLoansNeedingUpdate(); // Refresh total count after delete
    } catch (err) {
      message.error("Delete failed");
    }
  };

  const exportExcel = () => {
    window.open(
      `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/loans/export/excel`,
      "_blank"
    );
  };

  const refreshSelectedLoan = async () => {
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
            message.error(
              "Could not find the specific loan details after refresh."
            );
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

  const columns = getLoanColumns({ viewLoan, deleteLoan, onUpdateSingleLoan });

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
        exportExcel={exportExcel}
        statusOptions={statusOptions}
        paymentModeOptions={paymentModeOptions}
        yearOptions={yearOptions}
        statusLoading={statusLoading}
        paymentModeLoading={paymentModeLoading}
        yearLoading={yearLoading}
        tableLoading={loading}
        loansNeedingUpdateCount={totalLoansNeedingUpdateCount} // Use total count
        onViewUpdateLoans={() => {
          setSingleLoanToUpdate(null); // Clear single loan selection
          setIsUpdateModalVisible(true);
        }}
      />

      <Table
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        onChange={handleTableChange}
        scroll={{ x: 1100 }}
        className="loan-table"
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
                  handleTableChange(
                    { current: page, pageSize: pageSize },
                    {},
                    {}
                  )
                }
                showSizeChanger={false} // Disable default size changer
                showTotal={false} // Disable default total display
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
        visible={modalVisible} // <-- FIXED
        onClose={() => setModalVisible(false)}
        loan={selectedLoan}
        loading={isModalLoading} // optional: pass loading state too
        onLoanUpdate={refreshSelectedLoan}
      />

      <UpdateLoanNoModal
        visible={isUpdateModalVisible}
        onCancel={() => {
          setIsUpdateModalVisible(false);
          setSingleLoanToUpdate(null); // Clear single loan selection on close
        }}
        loansToUpdate={
          singleLoanToUpdate ? [singleLoanToUpdate] : allLoansNeedingUpdate
        }
        onLoanUpdated={() => {
          fetchLoans({ page: tableParams.current }); // Refresh current page
          fetchTotalLoansNeedingUpdate(); // Refresh total count for warning
          refreshSelectedLoan(); // Refresh the currently selected loan in the modal
        }}
      />
    </Card>
  );
}
