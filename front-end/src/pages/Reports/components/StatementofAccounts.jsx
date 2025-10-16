import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Table,
  Button,
  message,
  Input,
  Card,
  Tag,
  Tooltip,
  Switch,
  Space,
  Modal,
  Descriptions,
} from "antd";
import "../soa.css";
import api from "../../../utils/axios";
import ExportCollectionPDF from "../../../utils/ExportCollectionPDF";
import { getCache, setCache } from "../../../utils/simpleCache";

const { Search } = Input;

const StatementofAccounts = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [onlyWithCollections, setOnlyWithCollections] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [previewCollections, setPreviewCollections] = useState([]);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [localSearch, setLocalSearch] = useState("");
  const searchDebounceRef = useRef(null);

  const fetchLoans = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        q: filters.search,
        minimal: true,
        withCollections: onlyWithCollections ? 1 : undefined,
      };

      // Serve cached data immediately (stale-while-revalidate)
      const cacheKey = `soa:loans:list:${params.page}:${params.limit}:${(
        params.q || ""
      ).trim()}:with:${onlyWithCollections ? 1 : 0}`;
      const cached = getCache(cacheKey);
      if (cached) {
        setLoans(cached.data || []);
        setPagination(
          cached.meta || { current: page, pageSize, total: cached.total || 0 }
        );
      }

      const response = await api.get("/loans", { params });
      if (response.data.success) {
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        const meta = response.data.meta || {
          page,
          limit: pageSize,
          total: data.length,
        };
        setLoans(data);
        setPagination({
          current: meta.page,
          pageSize: meta.limit,
          total: meta.total,
        });
        // Cache fresh result for 5 minutes
        setCache(cacheKey, { data, meta, total: meta.total }, 5 * 60 * 1000);

        // Prefetch next page when available
        if (meta.total > params.page * params.limit) {
          const nextParams = { ...params, page: params.page + 1 };
          const nextKey = `soa:loans:list:${nextParams.page}:${
            nextParams.limit
          }:${(nextParams.q || "").trim()}:with:${onlyWithCollections ? 1 : 0}`;
          if (!getCache(nextKey)) {
            const idle = (cb) =>
              "requestIdleCallback" in window
                ? window.requestIdleCallback(cb, { timeout: 1500 })
                : setTimeout(cb, 500);
            idle(async () => {
              try {
                const resp = await api.get("/loans", { params: nextParams });
                if (resp.data?.success) {
                  const nextData = Array.isArray(resp.data.data)
                    ? resp.data.data
                    : [];
                  const nextMeta = resp.data.meta || {
                    page: nextParams.page,
                    limit: nextParams.limit,
                    total: nextData.length,
                  };
                  setCache(
                    nextKey,
                    { data: nextData, meta: nextMeta, total: nextMeta.total },
                    5 * 60 * 1000
                  );
                }
              } catch {}
            });
          }
        }
      } else {
        message.error("Failed to fetch loans");
      }
    } catch (error) {
      message.error("An error occurred while fetching loans");
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoans();
  }, [filters, onlyWithCollections]);

  const handleTableChange = (pagination) => {
    fetchLoans(pagination.current, pagination.pageSize);
  };

  // Open preview modal: fetch collections and compute summary
  const openSOAPreview = async (record) => {
    setPreviewRecord(record);
    setPreviewVisible(true);
    setPreviewLoading(true);
    setPreviewCollections([]);
    setPreviewSummary(null);
    try {
      // Step 1: request fast summary only
      const summaryRes = await api.get(`/loan-collections`, {
        params: {
          limit: 0,
          minimal: 1,
          summary: 1,
          loanCycleNo: record.loanInfo.loanNo,
          accountId: record.accountId || record.AccountId,
          clientNo: record.loanInfo.clientNo || record.ClientNo,
        },
        timeout: 60000,
      });

      if (summaryRes.data?.success) {
        const s = summaryRes.data.summary || {};
        const summary = {
          count: s.count || 0,
          firstDate: s.firstDate ? new Date(s.firstDate) : null,
          lastDate: s.lastDate ? new Date(s.lastDate) : null,
          totalCollection: s.totalCollection || 0,
          lastRunningBalance: s.lastRunningBalance || 0,
        };
        setPreviewSummary(summary);
        // Do not fetch rows here; defer to Generate action to avoid timeouts
        setPreviewCollections([]);
      } else {
        message.error("Failed to fetch collection summary");
      }
    } catch (e) {
      console.error(e);
      message.error("Failed to fetch collection data");
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmGenerateSOA = async () => {
    if (!previewRecord) return;
    try {
      message.loading({ content: "Generating PDF...", key: "pdf" });
      // Ensure we have the rows. If not loaded, fetch them now in minimal mode
      let rows = previewCollections;
      if (!Array.isArray(rows) || rows.length === 0) {
        const rowsRes = await api.get(`/loan-collections`, {
          params: {
            limit: 0,
            minimal: 1,
            loanCycleNo: previewRecord.loanInfo.loanNo,
            accountId: previewRecord.accountId || previewRecord.AccountId,
            clientNo: previewRecord.loanInfo.clientNo || previewRecord.ClientNo,
          },
          timeout: 120000,
        });
        rows = Array.isArray(rowsRes.data?.data) ? rowsRes.data.data : [];
      }
      ExportCollectionPDF(previewRecord, rows);
      message.success({ content: "PDF Generated!", key: "pdf", duration: 2 });
      setPreviewVisible(false);
      setPreviewRecord(null);
      setPreviewCollections([]);
      setPreviewSummary(null);
    } catch (e) {
      console.error(e);
      message.error({ content: "Failed to generate PDF.", key: "pdf" });
    }
  };

  const STATUS_COLORS = {
    UPDATED: "green",
    UPDATE: "green",
    ARREARS: "orange",
    "PAST DUE": "red",
    LITIGATION: "volcano",
    DORMANT: "grey",
    CLOSED: "default",
    Approved: "blue",
    Pending: "gold",
    Released: "purple",
    "Loan Released": "purple",
    "LOAN APPROVED": "green",
    PAID: "blue",
    DEFAULT: "red",
    PENDING: "orange",
    ACTIVE: "cyan",
  };

  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || "default";
  };

  const columns = [
    {
      title: "Loan & Client No",
      key: "loanNo",
      sorter: (a, b) => a.loanInfo.clientNo.localeCompare(b.loanInfo.clientNo),
      render: (_, record) => (
        <div>
          <div>{record.loanInfo.loanNo}</div>
          <div style={{ fontSize: "12px", color: "gray" }}>
            {record.loanInfo.clientNo}
          </div>
        </div>
      ),
    },
    {
      title: "Client Name & Address",
      key: "clientName",
      render: (_, record) => (
        <div>
          <div>{record.fullName}</div>
          <div style={{ fontSize: "12px", color: "gray" }}>
            {[
              record.address.barangay,
              record.address.city,
              record.address.province,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
        </div>
      ),
    },
    {
      title: "Loan Information",
      key: "loanInfo",
      render: (_, record) => (
        <div>
          <div>
            <strong>Amount:</strong>{" "}
            {record.loanInfo.amount?.toLocaleString("en-PH", {
              style: "currency",
              currency: "PHP",
            })}
          </div>
          <div>
            <strong>Balance:</strong>{" "}
            {record.loanInfo.balance?.toLocaleString("en-PH", {
              style: "currency",
              currency: "PHP",
            })}
          </div>
          <div>
            <strong>Maturity:</strong>{" "}
            {new Date(record.loanInfo.maturityDate).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: ["loanInfo", "status"],
      key: "status",
      sorter: (a, b) => {
        const order = { UPDATE: 1, DORMANT: 2 };
        const statusA = a.loanInfo.status;
        const statusB = b.loanInfo.status;
        const orderA = order[statusA] || 3;
        const orderB = order[statusB] || 3;

        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return statusA.localeCompare(statusB);
      },
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: "Last Collection",
      key: "lastCollection",
      render: (_, record) => {
        const d =
          record?.loanInfo?.lastCollectionDate ||
          record?.latestCollectionUpdate;
        return d ? new Date(d).toLocaleDateString() : "—";
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        // Enable button strictly when server confirms collections exist
        const hasCollections = Number(record?.collectionCount || 0) > 0;
        const btn = (
          <Button
            type="primary"
            disabled={!hasCollections}
            onClick={() => hasCollections && openSOAPreview(record)}
          >
            Generate SOA
          </Button>
        );
        return hasCollections ? (
          btn
        ) : (
          <Tooltip title="No collections uploaded/encoded yet">
            <span>{btn}</span>
          </Tooltip>
        );
      },
    },
  ];

  // Local search within the currently loaded table rows (client-side)
  const onSearchChange = (e) => {
    const value = e?.target?.value ?? "";
    setLocalSearch(value);
  };

  // Apply client-side filtering to the loaded rows only
  const displayedLoans = useMemo(() => {
    const term = (localSearch || "").toString().trim().toLowerCase();
    if (!term) return loans;
    const safeStr = (v) => (v == null ? "" : String(v));
    return loans.filter((r) => {
      try {
        const parts = [];
        parts.push(safeStr(r.loanInfo?.loanNo));
        parts.push(safeStr(r.loanInfo?.clientNo));
        parts.push(safeStr(r.fullName));
        parts.push(safeStr(r.address?.barangay));
        parts.push(safeStr(r.address?.city));
        parts.push(safeStr(r.address?.province));
        parts.push(safeStr(r.loanInfo?.status));
        const joined = parts.join(" | ").toLowerCase();
        return joined.includes(term);
      } catch {
        return false;
      }
    });
  }, [loans, localSearch]);

  return (
    <Card
      className="soa-card"
      title="Statement of Accounts"
      extra={
        <Space size={12} className="soa-extra">
          <Search
            placeholder="Search by Loan No or Client Name"
            value={localSearch}
            onChange={onSearchChange}
            onSearch={(value) => {
              // Trigger server-side search only on explicit action (Enter/search icon)
              setFilters((prev) => ({ ...prev, search: value }));
              setPagination((p) => ({ ...p, current: 1 }));
            }}
            className="soa-search"
            style={{ width: 320, maxWidth: "40vw" }}
            allowClear
            size="small"
          />
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Switch
              checked={onlyWithCollections}
              onChange={(checked) => {
                setOnlyWithCollections(checked);
                // reset to first page and refetch with new flag
                setPagination((p) => ({ ...p, current: 1 }));
                fetchLoans(1, pagination.pageSize);
              }}
              size="small"
            />
            <span style={{ fontSize: 12 }}>Only with collections</span>
          </span>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={displayedLoans}
        rowKey="_id"
        loading={loading}
        pagination={pagination}
        className="soa-table"
        onChange={handleTableChange}
      />

      <Modal
        open={previewVisible}
        title={
          previewRecord
            ? `Generate SOA: ${previewRecord.loanInfo?.loanNo || ""}`
            : "Generate SOA"
        }
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewRecord(null);
          setPreviewCollections([]);
          setPreviewSummary(null);
        }}
        okText="Generate SOA"
        okButtonProps={{
          disabled:
            previewLoading ||
            !previewSummary ||
            (previewSummary?.count || 0) === 0,
        }}
        onOk={confirmGenerateSOA}
      >
        {previewLoading ? (
          <div>Loading collections summary…</div>
        ) : previewSummary ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Records">
              {previewSummary.count}
            </Descriptions.Item>
            <Descriptions.Item label="Period">
              {previewSummary.firstDate
                ? previewSummary.firstDate.toLocaleDateString()
                : "—"}
              {" to "}
              {previewSummary.lastDate
                ? previewSummary.lastDate.toLocaleDateString()
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Total Collected">
              {new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
              }).format(previewSummary.totalCollection || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Last Running Balance">
              {new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
              }).format(previewSummary.lastRunningBalance || 0)}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div>No collections found for this account.</div>
        )}
      </Modal>
    </Card>
  );
};

export default StatementofAccounts;
