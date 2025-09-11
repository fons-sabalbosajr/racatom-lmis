// src/pages/Loans.jsx
import React, { useEffect, useState } from "react";
import { Card, Table, Typography, message } from "antd";
import api from "../../utils/axios";
import { getLoanColumns } from "./components/LoanColumns";
import LoanFilters from "./components/LoanFilters";
import LoanDetailsModal from "./components/LoanDetailsModal";
import "./loan.css";

const { Title } = Typography;

export default function Loans() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);

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
        setPaymentModeOptions(res.data.data);
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
      setLoading(true);
      // Fetch all loans for this client
      const loansRes = await api.get(`/loans/client/${record.clientNo}`);
      // Fetch documents for this client
      const docsRes = await api.get(`/loans/client/${record.clientNo}/documents`);

      if (loansRes.data.success && docsRes.data.success) {
        const currentLoan = loansRes.data.data.find(loan => loan._id === record._id);
        setSelectedLoan({
          ...currentLoan,
          allClientLoans: loansRes.data.data,
          clientDocuments: docsRes.data.data // Add documents here
        });
        setModalVisible(true);
      } else {
        message.error("Failed to fetch client data.");
      }
    } catch (err) {
      console.error(err);
      message.error("Error fetching client data.");
    } finally {
      setLoading(false);
    }
  };

  const deleteLoan = async (id) => {
    try {
      await api.delete(`/loans/${id}`);
      message.success("Deleted");
      fetchLoans({ page: tableParams.current });
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

  const columns = getLoanColumns({ viewLoan, deleteLoan });

  return (
    <Card className="loan-card">
      <Title level={3}>Loans</Title>
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
      />

      <Table
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: meta.page,
          pageSize: meta.limit,
          total: meta.total,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1100 }}
        className="loan-table"
      />

      <LoanDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        loan={selectedLoan}
        loading={loading}
      />
    </Card>
  );
}
