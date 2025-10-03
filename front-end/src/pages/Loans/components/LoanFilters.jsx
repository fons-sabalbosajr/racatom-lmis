import React, { useState, useCallback } from "react";
import { Input, Select, Button, Alert } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Search } = Input;

export default function LoanFilters({
  q,
  loanStatus,
  paymentMode,
  year,
  setQ,
  setLoanStatus,
  setPaymentMode,
  setYear,
  handleSearch,
  exportExcel,
  statusOptions = [],
  paymentModeOptions = [],
  yearOptions = [],
  statusLoading = false,
  paymentModeLoading = false,
  yearLoading = false,
  tableLoading = false,
  loansNeedingUpdateCount = 0,
  onViewUpdateLoans,
}) {
  const [filters, setFilters] = useState({
    q,
    loanStatus,
    paymentMode,
    year,
  });

  // This function now only updates the search text state.
  // The automatic debounced search has been removed.
  const handleQChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, q: value }));
    setQ(value);
  };

  return (
    <>
      {loansNeedingUpdateCount > 0 && (
        <Alert
          message={
            <span>
              Warning: {loansNeedingUpdateCount} loan accounts need their Loan
              No. updated.{" "}
              <Button
                type="link"
                onClick={onViewUpdateLoans}
                style={{ padding: 0, height: "auto" }}
              >
                View and Update
              </Button>
            </span>
          }
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        className="loan-filters"
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* 🔍 Search Input MODIFIED */}
        <Search
          placeholder="Search by any keyword..."
          value={filters.q}
          onChange={handleQChange}
          onSearch={handleSearch} // Triggers search on button click or Enter key
          allowClear
          size="medium"
          style={{ maxWidth: 220 }}
        />

        {/* 🏷️ Loan Status (No Change) */}
        <Select
          placeholder="Loan Status"
          allowClear
          value={filters.loanStatus || undefined}
          onChange={(v) => {
            setFilters((prev) => ({ ...prev, loanStatus: v || "" }));
            setLoanStatus(v || "");
            handleSearch();
          }}
          loading={statusLoading}
          disabled={statusLoading}
          style={{ minWidth: 160 }}
        >
          <Option key="all-status" value="">
            All Loan Status
          </Option>
          {statusOptions
            .filter((s) => s && s.trim() !== "")
            .map((s) => (
              <Option key={s} value={s}>
                {s}
              </Option>
            ))}
        </Select>

        {/* 💳 Payment Mode (No Change) */}
        <Select
          placeholder="Payment Mode"
          allowClear
          value={filters.paymentMode || undefined}
          onChange={(v) => {
            setFilters((prev) => ({ ...prev, paymentMode: v || "" }));
            setPaymentMode(v || "");
            handleSearch();
          }}
          loading={paymentModeLoading}
          disabled={paymentModeLoading}
          style={{ minWidth: 160 }}
        >
          <Option key="all-payment-mode" value="">
            All Payment Modes
          </Option>
          {paymentModeOptions
            .filter((m) => m && m.trim() !== "")
            .map((m) => (
              <Option key={m} value={m}>
                {m}
              </Option>
            ))}
        </Select>

        {/* 📅 Year (No Change) */}
        <Select
          placeholder="Year"
          allowClear
          value={filters.year || undefined}
          onChange={(v) => {
            setFilters((prev) => ({ ...prev, year: v || "" }));
            setYear(v || "");
            handleSearch();
          }}
          loading={yearLoading}
          disabled={yearLoading}
          style={{ minWidth: 120 }}
        >
          <Option key="all" value="">
            All
          </Option>
          {yearOptions.map((y) => (
            <Option key={y} value={y}>
              {y}
            </Option>
          ))}
        </Select>

        {/* 🧾 Export */}
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
    </>
  );
}