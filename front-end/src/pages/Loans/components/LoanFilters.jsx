import React, { useEffect, useState } from "react";
import { Input, Select, Button } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";

const { Option } = Select;

export default function LoanFilters({
  q,
  loanStatus,
  paymentMode,
  year, // ✅ new prop
  setQ,
  setLoanStatus,
  setPaymentMode,
  setYear, // ✅ new setter
  handleSearch,
  exportExcel,
  statusOptions = [],
  paymentModeOptions = [],
  yearOptions = [], // ✅ new prop
  statusLoading = false,
  paymentModeLoading = false,
  yearLoading = false,
  tableLoading = false,
}) {
  const [filters, setFilters] = useState({
    q,
    loanStatus,
    paymentMode,
    year,
  });

  // 🔹 Debounce filters
  useEffect(() => {
    const delay = setTimeout(() => {
      handleSearch(filters);
    }, 400);
    return () => clearTimeout(delay);
  }, [filters]);

  return (
    <div
      className="loan-filters"
      style={{ display: "flex", gap: "8px", alignItems: "center" }}
    >
      <Input
        className="loan-search"
        placeholder="Search by any keyword..."
        prefix={<SearchOutlined />}
        value={filters.q}
        onChange={(e) => {
          setFilters((prev) => ({ ...prev, q: e.target.value }));
          setQ(e.target.value);
        }}
        allowClear
        size="small"
        style={{ maxWidth: 220 }}
      />

      <Select
        className="loan-select"
        placeholder="Loan Status"
        allowClear
        value={filters.loanStatus || undefined}
        onChange={(v) => {
          setFilters((prev) => ({ ...prev, loanStatus: v || "" }));
          setLoanStatus(v || "");
        }}
        loading={statusLoading}
        disabled={statusLoading}
        style={{ minWidth: 160 }}
      >
        <Option key="all-status" value="">All Loan Status</Option>
        {statusOptions
          .filter((status) => status && status.trim() !== "")
          .map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
      </Select>

      <Select
        className="loan-select"
        placeholder="Payment Mode"
        allowClear
        value={filters.paymentMode || undefined}
        onChange={(v) => {
          setFilters((prev) => ({ ...prev, paymentMode: v || "" }));
          setPaymentMode(v || "");
        }}
        loading={paymentModeLoading}
        disabled={paymentModeLoading}
        style={{ minWidth: 160 }}
      >
        <Option key="all-payment-mode" value="">All Payment Modes</Option>
        {paymentModeOptions
          .filter((mode) => mode && mode.trim() !== "")
          .map((mode) => (
            <Option key={mode} value={mode}>
              {mode}
            </Option>
          ))}
      </Select>

      <Select
        className="loan-select"
        placeholder="Year"
        value={filters.year || undefined} // Use undefined for placeholder when cleared
        onChange={(v) => {
          setFilters((prev) => ({ ...prev, year: v || "" })); // Set to empty string if cleared
          setYear(v || "");
        }}
        loading={yearLoading}
        disabled={yearLoading}
        style={{ minWidth: 120 }}
        allowClear // Enable clear button
      >
        <Option key="all" value="">All</Option> {/* Add 'All' option */}
        {yearOptions.map((y) => (
          <Option key={y} value={y}>
            {y}
          </Option>
        ))}
      </Select>

      {/* Spacer to push button to right */}
      <div style={{ flex: 1 }} />

      <Button
        icon={<DownloadOutlined />}
        onClick={exportExcel}
        disabled={tableLoading}
        type="primary"
      >
        Export Excel
      </Button>
    </div>
  );
}
