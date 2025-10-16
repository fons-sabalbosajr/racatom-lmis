// src/pages/Loans.jsx
import React, { useEffect, useState } from "react";
import { Card, Table, Typography, message, Pagination, Select, Alert } from "antd";
import api from "../../utils/axios";
import { getCache, setCache } from "../../utils/simpleCache";
import { lsGet, lsGetSession, lsSetSession } from "../../utils/storage";
import { getLoanColumns } from "./components/LoanColumns";
import LoanFilters from "./components/LoanFilters";
import LoanDetailsModal from "./components/LoanDetailsModal";
import UpdateLoanNoModal from "./components/UpdateLoanNoModal";
import ExportCollectionPDF from "../../utils/ExportCollectionPDF";
import ExportLoanSummaryPDF from "../../utils/ExportLoanSummaryPDF";
import "./loan.css";

import UpdateStatusSummaryModal from "./components/UpdateStatusSummaryModal";
import { useRef } from "react";
import { useDevSettings } from "../../context/DevSettingsContext";

const { Title } = Typography;

export default function Loans() {
  const { settings } = useDevSettings();
  // derive developer flag from stored user
  const sessionUser = lsGetSession("user") || lsGet("user");
  const menus = (sessionUser?.permissions?.menus) || {};
  const pos = String(sessionUser?.Position || "").toLowerCase();
  const isDeveloper = pos === "developer" || !!(menus.developerSettings || menus.settingsDatabase || menus.admin);
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
  const searchDebounceRef = useRef(null);
  const hydratedRef = useRef(false);
  const QUERY_KEY = "loans:lastQuery";

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { field, order } = tableParams.sorter || {};
      const params = {
        page: tableParams.current,
        limit: tableParams.pageSize,
        q,
        loanStatus,
        paymentMode,
        year,
        sortBy: field || "AccountId",
        sortDir: order === "descend" ? "desc" : "asc",
      };
  // Always request full projection to compute latest active cycle per account for display
  const cacheKey = `loans:list:${params.page}:${params.limit}:${params.sortBy}:${params.sortDir}:${params.loanStatus || ''}:${params.paymentMode || ''}:${params.year || ''}:${(q || '').trim()}`;
      // Serve cached data immediately (stale-while-revalidate)
      const cached = getCache(cacheKey);
      if (cached) {
        setData(cached.data || []);
        setMeta(cached.meta || { page: tableParams.current, limit: tableParams.pageSize, total: cached.total || 0 });
      }

      const res = await api.get("/loans", { params });
      if (res.data.success) {
        // Use server-computed fields (collectionStatus, counts) to avoid N+1 requests per row
        const loans = Array.isArray(res.data.data) ? res.data.data : [];
        // Normalize display fields to avoid empty values
        const normalized = loans.map((loan) => {
          const loanInfo = loan.loanInfo || {};
          const address = loan.address || {};
          return {
            ...loan,
            loanInfo: {
              ...loanInfo,
              loanNo: loanInfo.loanNo || loan.loanNo || "",
              paymentMode: loanInfo.paymentMode || "N/A",
              status: loanInfo.status || "N/A",
              processStatus: loanInfo.processStatus || "N/A",
              amount: Number(loanInfo.amount) || 0,
              balance: Number(loanInfo.balance) || 0,
            },
            address: {
              barangay: address.barangay || "",
              city: address.city || "",
              province: address.province || "",
            },
            fullName: (loan.fullName || "").trim(),
            accountId: loan.accountId || loan.AccountId || "",
            collectionStatus: loan.collectionStatus || "No Data Encoded",
          };
        });

        // Compute displayLoanInfo per account: pick latest non-closed cycle; fallback to latest
        const groups = normalized.reduce((acc, row) => {
          const key = row.accountId || row.AccountId || "";
          if (!key) return acc;
          (acc[key] ||= []).push(row);
          return acc;
        }, {});
        const pickLatest = (arr) => {
          const sorted = [...arr].sort((a, b) => {
            const ta = new Date(a.updatedAt || a.createdAt || a.loanInfo?.lastCollectionDate || 0).getTime();
            const tb = new Date(b.updatedAt || b.createdAt || b.loanInfo?.lastCollectionDate || 0).getTime();
            return tb - ta;
          });
          const active = sorted.find((r) => String(r.loanInfo?.status).toUpperCase() !== "CLOSED");
          return active || sorted[0];
        };
        const latestByAccount = {};
        Object.keys(groups).forEach((accId) => {
          const chosen = pickLatest(groups[accId]);
          latestByAccount[accId] = {
            amount: Number(chosen?.loanInfo?.amount) || 0,
            balance: Number(chosen?.loanInfo?.balance) || 0,
            paymentMode: chosen?.loanInfo?.paymentMode || "N/A",
          };
        });
        const enriched = normalized.map((row) => ({
          ...row,
          displayLoanInfo: latestByAccount[row.accountId] || row.loanInfo,
        }));

        const metaVal = res.data.meta || { page: tableParams.current, limit: tableParams.pageSize, total: normalized.length };

  setData(enriched);
  setMeta(metaVal);
        // Cache fresh result per page for 5 minutes
        setCache(cacheKey, { data: normalized, meta: metaVal, total: metaVal.total }, 5 * 60 * 1000);
        // Prefetch next page when idle
        try {
          if (metaVal.total > (params.page * params.limit)) {
            const nextParams = { ...params, page: params.page + 1 };
            const nextKey = `loans:list:${nextParams.page}:${nextParams.limit}:${nextParams.sortBy}:${nextParams.sortDir}:${nextParams.loanStatus || ''}:${nextParams.paymentMode || ''}:${nextParams.year || ''}:${(q || '').trim()}`;
            if (!getCache(nextKey)) {
              // yield to browser idle time
              const idle = (cb) => ("requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 500));
              idle(async () => {
                try {
                  const resp = await api.get("/loans", { params: nextParams });
                  if (resp.data?.success) {
                    const nextLoans = Array.isArray(resp.data.data) ? resp.data.data : [];
                    const nextNormalized = nextLoans.map((loan) => {
                      const loanInfo = loan.loanInfo || {};
                      const address = loan.address || {};
                      return {
                        ...loan,
                        loanInfo: {
                          ...loanInfo,
                          loanNo: loanInfo.loanNo || loan.loanNo || "",
                          paymentMode: loanInfo.paymentMode || "N/A",
                          status: loanInfo.status || "N/A",
                          processStatus: loanInfo.processStatus || "N/A",
                          amount: Number(loanInfo.amount) || 0,
                          balance: Number(loanInfo.balance) || 0,
                        },
                        address: {
                          barangay: address.barangay || "",
                          city: address.city || "",
                          province: address.province || "",
                        },
                        fullName: (loan.fullName || "").trim(),
                        accountId: loan.accountId || loan.AccountId || "",
                        collectionStatus: loan.collectionStatus || "No Data Encoded",
                      };
                    });
                    // Attach displayLoanInfo for prefetched page as well
                    const groups2 = nextNormalized.reduce((acc, row) => {
                      const key = row.accountId || row.AccountId || "";
                      if (!key) return acc;
                      (acc[key] ||= []).push(row);
                      return acc;
                    }, {});
                    const latest2 = {};
                    Object.keys(groups2).forEach((accId) => {
                      const chosen = pickLatest(groups2[accId]);
                      latest2[accId] = {
                        amount: Number(chosen?.loanInfo?.amount) || 0,
                        balance: Number(chosen?.loanInfo?.balance) || 0,
                        paymentMode: chosen?.loanInfo?.paymentMode || "N/A",
                      };
                    });
                    const nextEnriched = nextNormalized.map((row) => ({
                      ...row,
                      displayLoanInfo: latest2[row.accountId] || row.loanInfo,
                    }));
                    const nextMeta = resp.data.meta || { page: nextParams.page, limit: nextParams.limit, total: nextEnriched.length };
                    setCache(nextKey, { data: nextEnriched, meta: nextMeta, total: nextMeta.total }, 5 * 60 * 1000);
                  }
                } catch {}
              });
            }
          }
        } catch {}
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
    if (!hydratedRef.current) return;
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableParams]);

  // When automated status is enabled, trigger backend to apply current automated statuses
  useEffect(() => {
    const applyAutomation = async () => {
      try {
        if (!settings.autoLoanStatus) return;
        await api.post("/loans/apply-automated-statuses", {
          thresholds: settings.autoLoanStatusGrace || {},
        });
        // after backend update, refresh filters and current list
  await fetchStatuses();
        await fetchLoans();
      } catch (err) {
        // non-blocking; just log
        console.warn("Failed to apply automated statuses:", err?.response?.data || err?.message || err);
      }
    };
    applyAutomation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoLoanStatus, JSON.stringify(settings.autoLoanStatusGrace)]);

  const fetchTotalLoansNeedingUpdate = async () => {
    try {
      setFetchingTotalLoansNeedingUpdate(true);
      const res = await api.get("/loans", {
        params: { needsUpdate: true, limit: 10000 },
      });
      if (res.data.success) {
        const loans = res.data.data.filter((loan) => {
          const ln = loan.loanInfo?.loanNo || "";
          return /-R$/i.test(ln);
        });
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
      const cacheKey = "loans:statusOptions";
      const cached = getCache(cacheKey);
      if (cached) setStatusOptions(cached);
      const res = await api.get("/loans/statuses");
      if (res.data.success) {
        const options = (Array.isArray(res.data.data) ? res.data.data : [])
          .map((s) => (s == null ? "" : String(s).trim()))
          .filter((s) => s.length > 0);
        setStatusOptions(options);
        setCache(cacheKey, options, 10 * 60 * 1000); // 10 minutes
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
      const cacheKey = "loans:paymentModes";
      const cached = getCache(cacheKey);
      if (cached) setPaymentModeOptions(cached);
      const res = await api.get("/loans/payment-modes");
      if (res.data.success) {
        const filteredPaymentModes = res.data.data.filter(
          (mode) => mode !== null && mode !== undefined && mode !== ""
        );
        setPaymentModeOptions(filteredPaymentModes);
        setCache(cacheKey, filteredPaymentModes, 10 * 60 * 1000); // 10 minutes
      }
    } catch (err) {
      message.error("Failed to load payment modes");
    } finally {
      setPaymentModeLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      // hydrate from last session query first
      try {
        const saved = lsGetSession(QUERY_KEY);
        if (saved && typeof saved === "object") {
          if (typeof saved.q === "string") setQ(saved.q);
          if (typeof saved.loanStatus === "string") setLoanStatus(saved.loanStatus);
          if (typeof saved.paymentMode === "string") setPaymentMode(saved.paymentMode);
          if (typeof saved.year === "string") setYear(saved.year);
          if (saved.tableParams && typeof saved.tableParams === "object") {
            setTableParams((prev) => ({ ...prev, ...saved.tableParams }));
          }
        }
      } catch {}
      setYearLoading(true);
      try {
        const cacheKey = "loans:years";
        const cached = getCache(cacheKey);
        if (cached) setYearOptions(cached);
        const res = await api.get("/loans/years");
        if (res.data.success) {
          const years = (Array.isArray(res.data.data) ? res.data.data : [])
            .filter((y) => y !== null && y !== undefined && String(y).trim() !== "");
          setYearOptions(years);
          setCache(cacheKey, years, 24 * 60 * 60 * 1000); // 1 day
        }
      } catch (err) {
        console.error("Failed to fetch loan years", err);
      }
      setYearLoading(false);
      fetchStatuses();
      fetchPaymentModes();
      fetchTotalLoansNeedingUpdate();
      // mark hydrated and trigger initial fetch once
      hydratedRef.current = true;
      fetchLoans();
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
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setTableParams((prev) => ({
        ...prev,
        current: 1,
      }));
      fetchLoans();
    }, 250);
  };

  // persist the most recent query in session storage
  useEffect(() => {
    try {
      const payload = {
        q,
        loanStatus,
        paymentMode,
        year,
        tableParams,
      };
      lsSetSession(QUERY_KEY, payload);
    } catch {}
  }, [q, loanStatus, paymentMode, year, tableParams]);

  const viewLoan = async (record, initialTab = "1") => {
    try {
      setIsModalLoading(true);
      setModalInitialTab(initialTab);
      const clientNo = record.clientNo || record.loanInfo?.clientNo || "";
      const [loansRes, docsRes] = await Promise.all([
        api.get(`/loans/account/${record.accountId}`),
        clientNo
          ? api.get(`/loans/client/${clientNo}/documents`)
          : Promise.resolve({ data: { success: true, data: [] } }),
      ]);

      if (loansRes.data.success && docsRes.data.success) {
        const currentLoan = loansRes.data.data.find(
          (loan) => loan._id === record._id
        );

        if (currentLoan) {
          // Hydrate unified person and address fields so PersonalInfoTab shows correct values
          const ci = currentLoan.clientInfo || {};
          const rawPerson = currentLoan.person || {};
          const unifiedPerson = {
            ...rawPerson,
            firstName:
              rawPerson.firstName || currentLoan.FirstName || ci.FirstName || "",
            middleName:
              rawPerson.middleName || currentLoan.MiddleName || ci.MiddleName || "",
            lastName:
              rawPerson.lastName || currentLoan.LastName || ci.LastName || "",
            // Contacts (best-effort from multiple shapes)
            contactNo:
              rawPerson.contactNo ||
              currentLoan.contact?.contactNumber ||
              currentLoan.ContactNumber ||
              ci.contactNumber ||
              ci.ContactNumber ||
              "",
            alternateContactNo:
              rawPerson.alternateContactNo ||
              currentLoan.contact?.alternateContactNumber ||
              currentLoan.AlternateContactNumber ||
              ci.alternateContactNumber ||
              ci.AlternateContactNumber ||
              "",
            email:
              rawPerson.email ||
              currentLoan.contact?.email ||
              currentLoan.Email ||
              ci.email ||
              ci.Email ||
              "",
          };

          const unifiedAddress =
            currentLoan.address ||
            ci.address || {
              barangay:
                (ci.address && ci.address.barangay) ||
                ci.Barangay ||
                currentLoan.Barangay ||
                "",
              city:
                (ci.address && ci.address.city) ||
                ci.City ||
                currentLoan.City ||
                "",
              province:
                (ci.address && ci.address.province) ||
                ci.Province ||
                currentLoan.Province ||
                "",
            };

          const combinedLoanData = {
            ...currentLoan,
            person: unifiedPerson,
            address: unifiedAddress,
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
        const clientNo = selectedLoan.clientNo || selectedLoan.loanInfo?.clientNo || "";
        const [loansRes, docsRes] = await Promise.all([
          api.get(`/loans/account/${selectedLoan.accountId}`),
          clientNo
            ? api.get(`/loans/client/${clientNo}/documents`)
            : Promise.resolve({ data: { success: true, data: [] } }),
        ]);

        if (loansRes.data.success && docsRes.data.success) {
          const currentLoan = loansRes.data.data.find(
            (loan) => loan._id === selectedLoan._id
          );

          if (currentLoan) {
                      const combinedLoanData = {
                        ...currentLoan,
                        allClientLoans: loansRes.data.data,
                        clientDocuments: docsRes.data.data,
                      };            setSelectedLoan(combinedLoanData);
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
    enableAutoLoanStatus: settings.autoLoanStatus,
    autoLoanStatusGrace: settings.autoLoanStatusGrace,
    loanStatusFilter: loanStatus,
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
      {settings.autoLoanStatus && isDeveloper && (
        <div style={{ marginBottom: 8 }}>
          <Alert
            type="info"
            showIcon
            message="Automated Loan Status is activated"
            description="Configured grace periods in Developer Settings will take effect in the Status Summary column."
          />
        </div>
      )}

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
  className="loan-table corporate-table loans-with-bottom-gap"
        rowClassName={(record) =>
          record.loanInfo?.loanNo && /-R$/i.test(record.loanInfo.loanNo)
            ? "loan-needs-update"
            : ""
        }
        footer={() => (
          <div
            style={{ display: "flex", alignItems: "center", padding: "12px 0 28px" }}
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
