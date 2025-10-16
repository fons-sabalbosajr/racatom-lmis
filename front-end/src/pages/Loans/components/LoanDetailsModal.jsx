import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Typography,
  message,
  Tabs,
  Space,
  Row,
  Col,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Card,
  Tag,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import LoanRateConfig from "../../Settings/LoanRateConfig/LoanRateConfig";
import { getAutomatedLoanStatusDetailed } from "../../../utils/automatedLoanStatus";

import LoanPersonalInfoTab from "./LoanPersonalInfoTab";
import LoanInfoTab from "./LoanInfoTab";
import LoanDocumentsTab from "./LoanDocumentsTab";
import LoanAccountSecurityTab from "./LoanAccountSecurityTab";
import Collections from "../../Collections/Collections";

const { Text } = Typography;
const { Option } = Select;

const LOAN_TYPES = ["New", "Renewal"];
const LOAN_STATUSES = [
  "UPDATED",
  "ARREARS",
  "PAST DUE",
  "LITIGATION",
  "DORMANT",
  "CLOSED",
];
const PAYMENT_MODES = ["DAILY", "WEEKLY", "SEMI-MONTHLY", "MONTHLY"];
const LOAN_TERMS = [
  "1 month",
  "2 months",
  "3 months",
  "4 months",
  "5 months",
  "6 months",
  "7 months",
  "8 months",
  "9 months",
  "10 months",
  "11 months",
  "12 months",
];

const LOAN_PROCESS_STATUSES = [
  "Approved",
  "Updated",
  "Released",
  "Pending",
  "Loan Released",
];

// Colors for Loan Status
const LOAN_STATUS_COLORS = {
  UPDATED: "green",
  ARREARS: "orange",
  "PAST DUE": "red",
  LITIGATION: "volcano",
  DORMANT: "gray",
  CLOSED: "default",
};

// Colors for Loan Process Status
const LOAN_PROCESS_STATUS_COLORS = {
  Updated: "green",
  Approved: "blue",
  Pending: "gold",
  Released: "purple",
  "Loan Released": "purple",
};

// Colors for Loan Type
const LOAN_TYPE_COLORS = {
  New: "blue",
  Renewal: "purple",
};

export default function LoanDetailsModal({
  visible,
  onClose,
  loan,
  loading,
  onLoanUpdate,
  initialTabKey = "1",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(initialTabKey);

  useEffect(() => {
    if (visible) {
      setActiveTabKey(initialTabKey);
    } else {
      // Reset to default when modal is not visible
      setActiveTabKey("1");
    }
  }, [visible, initialTabKey]);
  const [editedLoan, setEditedLoan] = useState(loan);
  const [loanDisbursed, setLoanDisbursed] = useState([]);
  const [isAddLoanModalVisible, setIsAddLoanModalVisible] = useState(false);
  const [isEditLoanRecordModalVisible, setIsEditLoanRecordModalVisible] =
    useState(false);
  const [editingLoanRecord, setEditingLoanRecord] = useState(null);
  const [loanRates, setLoanRates] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [newLoanRecord, setNewLoanRecord] = useState({
    LoanNo: "",
    LoanType: "",
    LoanStatus: "",
    LoanAmount: 0,
    LoanBalance: 0,
    LoanAmortization: "",
    PaymentMode: "",
    StartPaymentDate: null,
    MaturityDate: null,
    PrincipalAmount: 0,
    LoanInterest: 0,
    Penalty: 0,
    LoanTerm: "",
    LoanProcessStatus: "",
    Date_Encoded: null,
    Date_Modified: null,
    CollectorName: "",
    Remarks: "",
  });
  const [mergedLoans, setMergedLoans] = useState([]);
  const [loanCollections, setLoanCollections] = useState([]);
  const [isLoanRateModalVisible, setIsLoanRateModalVisible] = useState(false);
  const [loanNoError, setLoanNoError] = useState(""); // State for LoanNo validation
  const hasTwoCycles = (loan?.allClientLoans?.length || 0) >= 1;

  // Responsive handling for Loan Rates modal width
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isTablet = viewportWidth <= 1080;

  // Normalize numbers possibly coming from Mongo Decimal128 or strings
  const toNumber = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    }
    if (typeof v === "object") {
      // Decimal128 as {$numberDecimal: "..."}
      if (v && typeof v.$numberDecimal === "string") {
        const n = parseFloat(v.$numberDecimal);
        return isNaN(n) ? null : n;
      }
      try {
        const s = v.toString?.();
        if (s) {
          const n = parseFloat(s);
          return isNaN(n) ? null : n;
        }
      } catch {}
    }
    return null;
  };

  // Import selected loan rate into the currently active form (Add or Edit loan record)
  const handleImportLoanRate = (rate) => {
    if (!rate) return;
    // Normalize fields
    const principal = Number(rate.Principal || 0);
    const termMonths = Number(rate.Term || 0);
    const mode = String(rate.Mode || "");
    const monthlyRatePct = Number(rate["Interest Rate/Month"] || 0);
    const totalInterest = principal * (monthlyRatePct / 100) * termMonths;
    const totalLoanAmount = principal + totalInterest;

    if (isAddLoanModalVisible) {
      setNewLoanRecord((prev) => ({
        ...prev,
        PrincipalAmount: principal,
        LoanInterest: Math.round(totalInterest * 100) / 100,
        LoanAmount: Math.round(totalLoanAmount * 100) / 100,
        PaymentMode: mode,
        LoanTerm: termMonths ? `${termMonths} months` : prev.LoanTerm,
      }));
      message.success("Imported loan rate to new loan record.");
    } else if (isEditLoanRecordModalVisible) {
      setEditingLoanRecord((prev) => ({
        ...prev,
        PrincipalAmount: principal,
        LoanInterest: Math.round(totalInterest * 100) / 100,
        LoanAmount: Math.round(totalLoanAmount * 100) / 100,
        PaymentMode: mode,
        LoanTerm: termMonths ? `${termMonths} months` : prev.LoanTerm,
      }));
      message.success("Imported loan rate to existing loan record.");
    } else {
      // No active record form; ignore
    }
    setIsLoanRateModalVisible(false);
  };

  useEffect(() => {
    if (loan) {
      const newEditedLoan = {
        ...loan,
        person: loan.person || {},
        address: loan.address || {},
      };
      setEditedLoan(newEditedLoan);
    } else {
      setEditedLoan(null);
    }
    setIsEditing(false);
  }, [loan]);

  // Fallback: if name fields are blank, attempt to pull raw client doc (debug endpoint) and hydrate
  useEffect(() => {
    const needNameHydration =
      visible &&
      editedLoan &&
      loan?.clientNo &&
      (!editedLoan.person?.firstName || !editedLoan.person?.lastName);
    if (!needNameHydration) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/loans/debug/raw-client/${loan.clientNo}`);
        if (cancelled) return;
        if (res.data?.success && res.data.data) {
          const raw = res.data.data;
          // Only hydrate if raw has non-empty names
          if (raw.FirstName || raw.MiddleName || raw.LastName) {
            setEditedLoan((prev) => {
              if (!prev) return prev;
              const next = { ...prev, person: { ...(prev.person || {}) } };
              if (raw.FirstName) next.person.firstName = raw.FirstName;
              if (raw.MiddleName) next.person.middleName = raw.MiddleName;
              if (raw.LastName) next.person.lastName = raw.LastName;
              return next;
            });
          }
        }
      } catch (e) {
        // Silent fail; leave fields blank
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[LoanDetailsModal] Name hydration failed", e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, editedLoan, loan?.clientNo]);

  useEffect(() => {
    if (visible) {
      api
        .get("/loan_rates")
        .then((res) => {
          setLoanRates(res.data);
        })
        .catch((err) => {
          console.error("Error fetching loan rates:", err);
          message.error("Could not load loan rate configurations.");
        });

      api
        .get("/collectors")
        .then((res) => {
          setCollectors(res.data.data);
        })
        .catch((err) => {
          console.error("Error fetching collectors:", err);
          message.error("Could not load collectors.");
        });
    }
  }, [visible]);

  useEffect(() => {
    if (loan?.clientNo) {
      const fetchLoanData = async () => {
        try {
          const [disbursedRes] = await Promise.all([
            api.get(`/loan_disbursed/client/${loan.clientNo}`),
          ]);

          if (disbursedRes.data.success) {
            setLoanDisbursed(disbursedRes.data.data);
          } else {
            setLoanDisbursed([]);
          }

          const allLoanCycleNos = new Set();
          loan?.allClientLoans?.forEach((l) => {
            if (l.LoanCycleNo) allLoanCycleNos.add(l.LoanCycleNo);
          });
          disbursedRes.data.data?.forEach((d) => {
            if (d.LoanCycleNo) allLoanCycleNos.add(d.LoanCycleNo);
          });

          const collectionPromises = Array.from(allLoanCycleNos).map(
            (cycleNo) =>
              api.get(`/loan-collections/${cycleNo}`, { params: { limit: 0 } })
          );

          const collectionsResults = await Promise.all(collectionPromises);
          const allCollections = collectionsResults.flatMap((res) =>
            res.data.success ? res.data.data : []
          );
          setLoanCollections(allCollections);
        } catch (err) {
          console.error("Error fetching loan data:", err);
          message.error("Error fetching loan data.");
          setLoanDisbursed([]);
          setLoanCollections([]);
        }
      };
      fetchLoanData();
    }
  }, [loan]);

  const handleEdit = () => setIsEditing(true);

  const handleSave = async () => {
    try {
      const payload = {
        ...editedLoan,
        ClientNo: editedLoan.clientNo,
        AccountId: editedLoan.accountId,
        loanInfo: {
          ...editedLoan.loanInfo,
          LoanCycleNo:
            editedLoan.loanInfo?.loanNo || editedLoan.loanInfo?.LoanCycleNo,
        },
      };

      const res = await api.put(`/loans/${editedLoan._id}`, payload);
      if (res.data.success) {
        message.success("Loan details updated successfully!");
        // Update local state with any normalized / updated values returned
        if (res.data.data) {
          setEditedLoan((prev) => ({ ...prev, ...res.data.data }));
        }
        if (onLoanUpdate) onLoanUpdate();
        // Keep modal open; just exit edit mode
      } else {
        message.error(res.data.message || "Failed to update loan details.");
        return;
      }
    } catch (err) {
      console.error("Error saving loan details:", err);
      message.error("Error saving loan details.");
      return;
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedLoan(loan);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    const fieldParts = field.split(".");

    setEditedLoan((prev) => {
      // Create a deep copy to avoid state mutation
      const newEditedLoan = JSON.parse(JSON.stringify(prev));

      let current = newEditedLoan;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!current[fieldParts[i]]) {
          current[fieldParts[i]] = {};
        }
        current = current[fieldParts[i]];
      }
      current[fieldParts[fieldParts.length - 1]] = value;

      return newEditedLoan;
    });
  };

  const handleNewLoanRecordChange = (field, value) => {
    // Real-time validation for Loan Number
    if (field === "LoanNo") {
      if (!value) {
        setLoanNoError("Loan Number cannot be empty.");
      } else if (mergedLoans.some((loan) => loan.LoanNo === value)) {
        setLoanNoError("This Loan Number already exists for the client.");
      } else {
        setLoanNoError("");
      }
    }

    setNewLoanRecord((prev) => {
      let updatedRecord = { ...prev, [field]: value };

      // Auto-generates a renewal number when type is changed, but allows manual override
      if (
        field === "LoanType" &&
        value === "Renewal" &&
        loan?.loanInfo.loanNo
      ) {
        const baseLoanNo = loan.loanInfo.loanNo.split("-R")[0];
        const renewalLoans = mergedLoans.filter(
          (d) => d.LoanNo && d.LoanNo.startsWith(`${baseLoanNo}-R`)
        );
        let maxRenewalNum = 0;
        renewalLoans.forEach((rl) => {
          const match = rl.LoanNo.match(/-R(\d+)$/);
          if (match) {
            maxRenewalNum = Math.max(maxRenewalNum, parseInt(match[1], 10));
          }
        });
        updatedRecord.LoanNo = `${baseLoanNo}-R${maxRenewalNum + 1}`;
      } else if (
        field === "LoanType" &&
        value === "New" &&
        loan?.loanInfo.loanNo
      ) {
        updatedRecord.LoanNo = loan.loanInfo.loanNo.split("-R")[0];
      }

      return updatedRecord;
    });
  };

  // 🟢 ADD NEW LOAN RECORD
  const handleAddLoanRecordSubmit = async () => {
    // Validate required fields
    if (loanNoError || !newLoanRecord.LoanNo) {
      if (!newLoanRecord.LoanNo) setLoanNoError("Loan Number cannot be empty.");
      message.error("Please fix the errors before submitting.");
      return;
    }

    try {
      // ✅ Ensure LoanBalance is initialized properly
      const payload = {
        ...newLoanRecord,
        ClientNo: loan.clientNo,
        AccountId: loan.accountId,
      };

      // Default LoanBalance = LoanAmount if missing
      if (
        (!payload.LoanBalance || payload.LoanBalance === 0) &&
        payload.LoanAmount > 0
      ) {
        payload.LoanBalance = payload.LoanAmount;
      }

      const res = await api.post("/loans/cycles", payload);

      if (res.data.success) {
        message.success("New loan record added successfully!");
        setIsAddLoanModalVisible(false);
        setLoanNoError("");

        // Reset the form state (optional)
        setNewLoanRecord({});

        // 🔄 Refresh parent data
        if (onLoanUpdate) onLoanUpdate();
      } else {
        message.error(res.data.message || "Failed to add loan record.");
      }
    } catch (err) {
      console.error("Error adding loan record:", err);
      message.error(err.response?.data?.message || "Error adding loan record.");
    }
  };

  // 🟢 OPEN EDIT LOAN RECORD MODAL
  const handleEditLoanRecord = (record) => {
    const updatedRecord = {
      ...record,
      // Ensure LoanBalance is always populated
      LoanBalance:
        record.LoanBalance ??
        record.RunningBalance ??
        record.loanInfo?.balance ??
        0,
    };
    setEditingLoanRecord(updatedRecord);
    setIsEditLoanRecordModalVisible(true);
  };

  // 🟢 UPDATE EXISTING LOAN RECORD
  const handleUpdateLoanRecord = async () => {
    try {
      // Prevent duplicate LoanNo among the client's cycles
      const dup = (mergedLoans || []).some(
        (l) =>
          l?._id !== editingLoanRecord?._id &&
          l?.LoanNo === editingLoanRecord?.LoanNo
      );
      if (dup) {
        message.error(
          "This Loan No already exists for this client. Please choose a unique Loan No."
        );
        return;
      }

      // Coerce numerics to ensure persistence on backend (Penalty, LoanAmortization, etc.)
      const toNum = (v) => (v === null || v === undefined || v === "" ? null : Number(String(v).replace(/[₱,]/g, "")));
      const base = { ...editingLoanRecord };
      const payload = {
        ...base,
        LoanAmount: toNum(base.LoanAmount),
        PrincipalAmount: toNum(base.PrincipalAmount),
        LoanBalance: toNum(base.LoanBalance),
        LoanInterest: toNum(base.LoanInterest),
        LoanAmortization: toNum(base.LoanAmortization),
        Penalty: toNum(base.Penalty),
      };
      if (payload.LoanBalance != null) payload.RunningBalance = payload.LoanBalance;
      // Map LoanNo -> LoanCycleNo so backend updates the primary loan cycle number
      if (payload.LoanNo && !payload.LoanCycleNo) {
        payload.LoanCycleNo = payload.LoanNo;
      }

      // Route to correct backend resource based on source
      let res;
      if (editingLoanRecord?.Source === "Disbursed") {
        res = await api.put(`/loan_disbursed/${editingLoanRecord._id}`, payload);
      } else {
        res = await api.put(`/loans/cycle/${editingLoanRecord._id}`, payload);
      }

      if (res.data.success) {
        message.success("Loan record updated successfully.");
        setIsEditLoanRecordModalVisible(false);

        // 🔁 Use parent’s refresh callback instead of undefined local function
        if (onLoanUpdate) onLoanUpdate();
        // Optionally recompute automated statuses for this cycle
        try {
          const cycleNo = payload.LoanCycleNo || payload.LoanNo;
          if (cycleNo) {
            await api.post('/loans/apply-automated-statuses', { filter: { LoanCycleNo: cycleNo } });
          }
        } catch {}
      } else {
        message.error(res.data.message || "Failed to update loan record.");
      }
    } catch (error) {
      console.error("Error updating loan record:", error);
      message.error("Failed to update loan record.");
    }
  };

  const handleDeleteLoanRecord = async (record) => {
    try {
      if (record.Source === "Client Loan") {
        await api.delete(`/loans/${record._id}`);
      } else if (record.Source === "Disbursed") {
        await api.delete(`/loan_disbursed/${record._id}`);
      } else {
        message.error("Unknown loan source, cannot delete.");
        return;
      }

      message.success("Loan record deleted successfully.");

      setMergedLoans((prev) => prev.filter((item) => item._id !== record._id));
    } catch (err) {
      console.error("Error deleting loan record:", err);
      message.error(
        err.response?.data?.message || "Failed to delete loan record."
      );
    }
  };

  const handleMarkAsClosed = async (record) => {
    try {
      const payload = { ...record, LoanStatus: "CLOSED" };
      const res = await api.put(`/loans/cycle/${record._id}`, payload);

      if (res.data.success) {
        message.success("Loan marked as closed.");
        if (onLoanUpdate) {
          onLoanUpdate();
        }
      } else {
        message.error(res.data.message || "Failed to update loan status.");
      }
    } catch (err) {
      console.error("Error updating loan status:", err);
      message.error("Error updating loan status.");
    }
  };

  const handleEditLoanRecordChange = (field, value) => {
    setEditingLoanRecord((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    const clientLoans =
      loan?.allClientLoans?.map((l) => {
        const latestCollection = loanCollections
          .filter((collection) => collection.LoanCycleNo === l.loanInfo.loanNo)
          .sort((a, b) => {
            const dateA = dayjs(a.PaymentDate || a.createdAt);
            const dateB = dayjs(b.PaymentDate || b.createdAt);
            if (dateA.isBefore(dateB)) return 1;
            if (dateA.isAfter(dateB)) return -1;

            const createdA = dayjs(a.createdAt);
            const createdB = dayjs(b.createdAt);
            if (createdA.isBefore(createdB)) return 1;
            if (createdA.isAfter(createdB)) return -1;
            return 0;
          })[0];

        // Compute automated status based on latest collection and maturity
        const auto = getAutomatedLoanStatusDetailed({
          paymentMode: l.loanInfo?.paymentMode,
          lastCollectionDate:
            latestCollection?.PaymentDate ||
            latestCollection?.updatedAt ||
            latestCollection?.createdAt ||
            null,
          maturityDate: l.loanInfo?.maturityDate || null,
          currentDate: new Date(),
          thresholds: undefined,
        });
        const computedStatus = auto?.status || l.loanInfo?.status;
        const lastAmort = latestCollection
          ? toNumber(
              latestCollection.CollectionPayment ??
                latestCollection.TotalCollected ??
                latestCollection.Amortization ??
                null
            )
          : null;
        const lastPenalty = latestCollection
          ? toNumber(latestCollection.Penalty)
          : null;

        return {
          _id: l._id,
          LoanNo: l.loanInfo?.loanNo,
          LoanType: l.loanInfo?.type,
          LoanStatus: computedStatus,
          LoanAmount: l.loanInfo?.amount,
          PrincipalAmount: l.loanInfo?.principal,
          LoanInterest: l.loanInfo?.interest,
          Penalty:
            lastPenalty != null && !isNaN(lastPenalty)
              ? lastPenalty
              : l.loanInfo?.penalty,
          // Prefer stored amortization (editable) over inferred last collection payment
          LoanAmortization:
            l.loanInfo?.amortization != null && !isNaN(l.loanInfo?.amortization) && Number(l.loanInfo?.amortization) > 0
              ? Number(l.loanInfo.amortization)
              : (lastAmort != null && !isNaN(lastAmort) && Number(lastAmort) > 0 ? Number(lastAmort) : null),
          LoanTerm: l.loanInfo?.term,
          LoanProcessStatus: l.loanInfo?.processStatus,
          CollectorName: l.loanInfo?.collectorName,
          Remarks: l.loanInfo?.remarks,
          Source: "Client Loan",
          PaymentMode: l.loanInfo?.paymentMode,
          StartPaymentDate: l.loanInfo?.startPaymentDate,
          MaturityDate: l.loanInfo?.maturityDate,
          LastCollectionDate:
            latestCollection?.PaymentDate ||
            latestCollection?.updatedAt ||
            latestCollection?.createdAt ||
            null,
          LastCollectionRef: latestCollection?.CollectionReferenceNo || "",
          RunningBalance: latestCollection
            ? toNumber(latestCollection.RunningBalance)
            : l.loanInfo?.balance,
          // Debug helpers to trace amortization source
          __DebugCycleAmort: l.loanInfo?.amortization ?? null,
          __DebugLastAmort: lastAmort,
        };
      }) || [];

    const clientLoanNos = new Set(clientLoans.map((l) => l.LoanNo));

    const disbursedLoans =
      loanDisbursed
        ?.filter((d) => !clientLoanNos.has(d.LoanNo))
        .map((d) => {
          const latestCollection = loanCollections
            .filter((collection) => collection.LoanCycleNo === d.LoanCycleNo)
            .sort((a, b) => {
              const dateA = dayjs(a.PaymentDate || a.createdAt);
              const dateB = dayjs(b.PaymentDate || b.createdAt);
              if (dateA.isBefore(dateB)) return 1;
              if (dateA.isAfter(dateB)) return -1;

              const createdA = dayjs(a.createdAt);
              const createdB = dayjs(b.createdAt);
              if (createdA.isBefore(createdB)) return 1;
              if (createdA.isAfter(createdB)) return -1;
              return 0;
            })[0];

          const auto = getAutomatedLoanStatusDetailed({
            paymentMode: d.PaymentMode,
            lastCollectionDate:
              latestCollection?.PaymentDate ||
              latestCollection?.updatedAt ||
              latestCollection?.createdAt ||
              null,
            maturityDate: d.MaturityDate || null,
            currentDate: new Date(),
            thresholds: undefined,
          });
          const lastAmort = latestCollection
            ? toNumber(
                latestCollection.CollectionPayment ??
                  latestCollection.TotalCollected ??
                  latestCollection.Amortization ??
                  null
              )
            : null;
          const lastPenalty = latestCollection
            ? toNumber(latestCollection.Penalty)
            : null;

          return {
            ...d,
            StartPaymentDate: d.StartPaymentDate
              ? dayjs(d.StartPaymentDate).toISOString()
              : null,
            MaturityDate: d.MaturityDate
              ? dayjs(d.MaturityDate).toISOString()
              : null,
            Remarks: d.Remarks,
            Source: "Disbursed",
            LoanStatus: auto?.status || d.LoanStatus,
            // Prefer stored amortization (editable) over inferred last collection payment
            LoanAmortization:
              d.LoanAmortization != null && !isNaN(d.LoanAmortization) && Number(d.LoanAmortization) > 0
                ? Number(d.LoanAmortization)
                : (lastAmort != null && !isNaN(lastAmort) && Number(lastAmort) > 0 ? Number(lastAmort) : null),
            Penalty:
              lastPenalty != null && !isNaN(lastPenalty)
                ? lastPenalty
                : d.Penalty,
            LastCollectionDate:
              latestCollection?.PaymentDate ||
              latestCollection?.updatedAt ||
              latestCollection?.createdAt ||
              null,
            LastCollectionRef: latestCollection?.CollectionReferenceNo || "",
            RunningBalance: latestCollection
              ? toNumber(latestCollection.RunningBalance)
              : d.LoanBalance,
            // Debug helpers to trace amortization source
            __DebugCycleAmort: d.LoanAmortization ?? null,
            __DebugLastAmort: lastAmort,
          };
        }) || [];

    const merged = [...clientLoans, ...disbursedLoans];

    // Console debug removed

    setMergedLoans(merged);
  }, [loan, loanDisbursed, loanCollections]);

  const generateLoanNo = (lastLoanNo, isRenewal = false) => {
    const year = new Date().getFullYear();
    let baseNumber;

    if (!lastLoanNo) {
      baseNumber = 11546;
      return `RCT-${year}-${baseNumber}`;
    }

    if (isRenewal) {
      const renewalMatch = lastLoanNo.match(/-R(\d+)$/);
      if (renewalMatch) {
        const renewalNumber = parseInt(renewalMatch[1], 10) + 1;
        return lastLoanNo.replace(/-R\d+$/, `-R${renewalNumber}`);
      } else {
        return `${lastLoanNo}-R1`;
      }
    }

    const parts = lastLoanNo.split("-");
    baseNumber = parseInt(parts[2], 10) + 1;
    return `RCT-${year}-${baseNumber}`;
  };

  useEffect(() => {
    if (isAddLoanModalVisible) {
      const lastLoan =
        mergedLoans.filter((l) => l.Source === "Disbursed").slice(-1)[0] ||
        mergedLoans.slice(-1)[0];
      const lastLoanNo = lastLoan?.LoanNo;

      const generatedLoanNo = generateLoanNo(lastLoanNo, false);

      setNewLoanRecord((prev) => ({
        ...prev,
        LoanNo: generatedLoanNo,
      }));

      // Validate the generated number immediately
      if (mergedLoans.some((loan) => loan.LoanNo === generatedLoanNo)) {
        setLoanNoError("Warning: Auto-generated Loan Number already exists.");
      } else {
        setLoanNoError("");
      }
    } else {
      // Clear error when modal is closed
      setLoanNoError("");
    }
  }, [isAddLoanModalVisible, mergedLoans]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null || val === "") {
      return "₱0.00";
    }
    const numericVal = Number(String(val).replace(/[₱,]/g, ""));
    return `₱${numericVal.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Track a map of document counts per LoanNo and the currently focused LoanNo for the Documents tab
  const [docCounts, setDocCounts] = useState({});
  const [focusedLoanNo, setFocusedLoanNo] = useState(null);

  // Helper to refresh count for a specific loan no after upload/delete if needed
  const refreshDocCounts = async () => {
    try {
      const accountId = loan?.accountId || loan?.AccountId;
      const loanNos = (mergedLoans || []).map((m) => m?.LoanNo).filter(Boolean);
      if (!accountId || loanNos.length === 0) {
        setDocCounts({});
        return;
      }
      const results = await Promise.allSettled(
        loanNos.map((ln) =>
          api
            .get(`/loans/account/${accountId}/cycle/${ln}/documents`)
            .then((res) => ({
              ln,
              count: Array.isArray(res?.data?.data) ? res.data.data.length : 0,
            }))
        )
      );
      const map = {};
      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          map[r.value.ln] = r.value.count;
        } else {
          const ln = loanNos[idx];
          map[ln] = 0;
        }
      });
      setDocCounts(map);
    } catch (e) {
      // ignore errors; keep previous counts
    }
  };

  useEffect(() => {
    if (visible) {
      refreshDocCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mergedLoans, loan?.accountId, loan?.AccountId]);

  const loanInfoColumns = [
    {
      title: "Loan No. & Status",
      key: "loanNoAndStatus",
      align: "left",
      render: (record) => (
        <>
          <div className="info-row">
            <span className="info-label">Loan No:</span>
            <span className="info-value">{record.LoanNo || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Loan Type:</span>
            <Tag
              className="info-tag"
              color={LOAN_TYPE_COLORS[record.LoanType] || "default"}
            >
              {record.LoanType || "N/A"}
            </Tag>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <Tag
              className="info-tag"
              color={LOAN_STATUS_COLORS[record.LoanStatus] || "default"}
            >
              {record.LoanStatus || "N/A"}
            </Tag>
          </div>
          {record.LoanProcessStatus && (
            <div className="info-row">
              <span className="info-label">Process Status:</span>
              <Tag
                className="info-tag"
                color={
                  LOAN_PROCESS_STATUS_COLORS[record.LoanProcessStatus] ||
                  "default"
                }
              >
                {record.LoanProcessStatus}
              </Tag>
            </div>
          )}
        </>
      ),
      width: 220,
    },
    {
      title: "Amounts",
      key: "amounts",
      align: "left",
      width: 180,
      render: (record) => (
        <>
          <div className="info-row">
            <span className="info-label">Loan:</span>
            <span className="info-value">
              {formatCurrency(record.LoanAmount)}
            </span>
          </div>
          {record.PrincipalAmount && (
            <div className="info-row">
              <span className="info-label">Principal:</span>
              <span className="info-value">
                {formatCurrency(record.PrincipalAmount)}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Balance:</span>
            <span className="info-value">
              {formatCurrency(record.RunningBalance)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Interest:</span>
            <span className="info-value">
              {formatCurrency(
                Math.max(
                  Number(record.LoanAmount || 0) -
                    Number(record.PrincipalAmount || 0),
                  0
                )
              )}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Penalty:</span>
            <span className="info-value">{formatCurrency(record.Penalty)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Amort:</span>
            <span className="info-value">
              {formatCurrency(record.LoanAmortization)}
            </span>
          </div>
          {record.LastCollectionDate && (
            <div className="info-row">
              <span className="info-label">Last Coll Date:</span>
              <span className="info-value">
                {dayjs(record.LastCollectionDate).format("MM/DD/YYYY")}
              </span>
            </div>
          )}
          {record.LastCollectionRef && (
            <div className="info-row">
              <span className="info-label">Last Ref No:</span>
              <span className="info-value">{record.LastCollectionRef}</span>
            </div>
          )}
        </>
      ),
    },
    {
      title: "Dates, Term & Collector",
      key: "datesTermAndCollector",
      align: "left",
      width: 200,
      render: (record) => (
        <>
          {record.StartPaymentDate && (
            <div className="info-row">
              <span className="info-label">Payment Start:</span>
              <span className="info-value">
                {dayjs(record.StartPaymentDate).format("MM/DD/YYYY")}
              </span>
            </div>
          )}
          {record.MaturityDate && (
            <div className="info-row">
              <span className="info-label">Payment Maturity:</span>
              <span className="info-value">
                {dayjs(record.MaturityDate).format("MM/DD/YYYY")}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Term:</span>
            <span className="info-value">{record.LoanTerm || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Payment:</span>
            <span className="info-value">{record.PaymentMode || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Collector:</span>
            <span className="info-value">{record.CollectorName || "N/A"}</span>
          </div>
        </>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "Remarks",
      key: "remarks",
      className: "col-remarks",
      width: 150,
      render: (text) => text || "N/A",
    },
    {
      title: "Files",
      key: "files",
      align: "center",
      width: 90,
      render: (record) => {
        const count = docCounts[record.LoanNo] ?? 0;
        return (
          <Space size={4}>
            {count > 0 && <Tag color="blue">{count}</Tag>}
            <Tooltip title="View documents for this Loan No">
              <Button
                size="small"
                onClick={() => {
                  setActiveTabKey("3");
                  setFocusedLoanNo(record.LoanNo);
                }}
              >
                View
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      className: "col-action",
      width: 100,
      render: (text, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEditLoanRecord(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this record?"
            onConfirm={() => handleDeleteLoanRecord(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="Are you sure you want to mark this loan as closed?"
            onConfirm={() => handleMarkAsClosed(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Mark as Closed">
              <Button icon={<CheckCircleOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Updated renderField to show validation status and help text
  const renderField = (
    label,
    field,
    value,
    type = "text",
    onChangeHandler,
    disabled = false,
    options = [],
    errorStatus = "",
    helpText = ""
  ) => {
    const labelContent = (
      <div style={{ display: "flex", alignItems: "center" }}>
        <Text style={{ fontWeight: "normal" }}>{label}</Text>
        {label === "Loan Amount" && (
          <Tooltip title="Check Loan Rates">
            <Button
              type="link"
              icon={<InfoCircleOutlined />}
              onClick={() => setIsLoanRateModalVisible(true)}
              style={{ marginLeft: 4, padding: 0, border: "none" }}
            />
          </Tooltip>
        )}
      </div>
    );

    return (
      <div
        style={{
          marginBottom: 12,
          paddingBottom: helpText ? "18px" : "0",
          position: "relative",
        }}
      >
        {labelContent}
        {type === "date" ? (
          <DatePicker
            value={value ? dayjs(value) : null}
            onChange={(date) =>
              onChangeHandler(field, date ? date.toISOString() : null)
            }
            disabled={disabled}
            style={{ width: "100%" }}
            status={errorStatus}
          />
        ) : type === "number" ? (
          <InputNumber
            value={value || 0}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={disabled}
            style={{ width: "100%" }}
            size="small"
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(val) => val.replace(/[^\d.]/g, "")}
            status={errorStatus}
          />
        ) : type === "select" ? (
          <Select
            value={value === null || value === undefined ? null : value}
            onChange={(val) => onChangeHandler(field, val)}
            disabled={disabled}
            style={{ width: "100%" }}
            placeholder={`Select ${label}`}
            status={errorStatus}
          >
            {options.map((option) => {
              if (field === "LoanStatus") {
                return (
                  <Option key={option} value={option}>
                    <Tag color={LOAN_STATUS_COLORS[option] || "default"}>
                      {option}
                    </Tag>
                  </Option>
                );
              }
              if (field === "LoanProcessStatus") {
                return (
                  <Option key={option} value={option}>
                    <Tag
                      color={LOAN_PROCESS_STATUS_COLORS[option] || "default"}
                    >
                      {option}
                    </Tag>
                  </Option>
                );
              }
              return (
                <Option key={option} value={option}>
                  {option}
                </Option>
              );
            })}
          </Select>
        ) : (
          <Input
            value={value || ""}
            onChange={(e) => onChangeHandler(field, e.target.value)}
            disabled={disabled}
            size="small"
            style={{ width: "100%", height: 32 }}
            type={type}
            status={errorStatus}
          />
        )}
        {helpText && (
          <Text
            type="danger"
            style={{ fontSize: "12px", position: "absolute", bottom: 0 }}
          >
            {helpText}
          </Text>
        )}
      </div>
    );
  };

  const isEditableTab = activeTabKey === "1" || activeTabKey === "5";

  return (
    <Modal
      title="Loan Details"
      open={visible}
      width={1200}
      className="compact-modal"
      onCancel={onClose}
      footer={[
        activeTabKey === "2" && !isEditing && (
          <Button
            key="addLoanRecord"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddLoanModalVisible(true)}
          >
            Add Loan Record
          </Button>
        ),
        isEditableTab && !isEditing && (
          <Button key="edit" icon={<EditOutlined />} onClick={handleEdit}>
            Edit
          </Button>
        ),
        isEditableTab && isEditing && (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            Save
          </Button>
        ),
        isEditableTab && isEditing && (
          <Button key="cancel" icon={<CloseOutlined />} onClick={handleCancel}>
            Cancel
          </Button>
        ),
        activeTabKey !== "4" && (
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ),
      ].filter(Boolean)}
    >
      {loading ? (
        <div>Loading...</div>
      ) : loan ? (
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          size="small"
          items={[
            {
              key: "1",
              label: "Personal Information",
              children: (
                <LoanPersonalInfoTab
                  editedLoan={editedLoan}
                  handleChange={handleChange}
                  isEditing={isEditing}
                />
              ),
            },
            {
              key: "2",
              label: "Loan Information",
              children: (
                <LoanInfoTab
                  mergedLoans={mergedLoans}
                  loanInfoColumns={loanInfoColumns}
                />
              ),
            },
            {
              key: "3",
              label: "Documents",
              children: (
                <LoanDocumentsTab
                  loan={loan}
                  accountId={loan?.accountId || loan?.AccountId}
                  cycles={mergedLoans}
                  selectedLoanNo={focusedLoanNo}
                  onDocumentsChanged={() => {
                    refreshDocCounts();
                  }}
                />
              ),
            },
            {
              key: "4",
              label: "Collections",
              children: loan && (
                <Collections
                  loan={loan}
                  loanCycles={mergedLoans.map((m) => m.LoanNo).filter(Boolean)} // 🟢 pass loan nos
                />
              ),
            },
            {
              key: "5",
              label: "Account Security",
              children: (
                <LoanAccountSecurityTab
                  editedLoan={editedLoan}
                  handleChange={handleChange}
                  isEditing={isEditing}
                />
              ),
            },
          ]}
        />
      ) : (
        <div>No loan details</div>
      )}

      <Modal
        title="Add New Loan Record"
        open={isAddLoanModalVisible}
        onCancel={() => setIsAddLoanModalVisible(false)}
        onOk={handleAddLoanRecordSubmit}
        width={800}
        className="compact-modal"
      >
        <>
          <Row gutter={16} align="stretch">
            <Col span={12}>
              <Card
                title="Loan Details"
                size="small"
                style={{ marginBottom: 16, minHeight: "235px" }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan No",
                      "LoanNo",
                      newLoanRecord.LoanNo,
                      "text",
                      handleNewLoanRecordChange,
                      false, // Set to false to enable editing
                      [], // No options for this text field
                      loanNoError ? "error" : "", // Pass validation status
                      loanNoError // Pass validation help text
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Loan Type",
                      "LoanType",
                      newLoanRecord.LoanType,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_TYPES
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Status",
                      "LoanStatus",
                      newLoanRecord.LoanStatus,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_STATUSES
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Loan Process Status",
                      "LoanProcessStatus",
                      newLoanRecord.LoanProcessStatus,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_PROCESS_STATUSES
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    {renderField(
                      "Remarks",
                      "Remarks",
                      newLoanRecord.Remarks,
                      "text",
                      handleNewLoanRecordChange,
                      false
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={12}>
              <Card
                title="Loan Amount Details"
                size="small"
                style={{ marginBottom: 16, minHeight: "235px" }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Amount",
                      "LoanAmount",
                      newLoanRecord.LoanAmount,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Principal Amount",
                      "PrincipalAmount",
                      newLoanRecord.PrincipalAmount,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Balance",
                      "LoanBalance",
                      newLoanRecord.LoanBalance,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Loan Interest",
                      "LoanInterest",
                      newLoanRecord.LoanInterest,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Penalty",
                      "Penalty",
                      newLoanRecord.Penalty,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Amortization",
                      "LoanAmortization",
                      newLoanRecord.LoanAmortization,
                      "number",
                      handleNewLoanRecordChange
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} align="stretch">
            <Col span={12}>
              <Card
                title="Terms and Payments"
                size="small"
                style={{ marginBottom: 16, minHeight: "200px" }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {renderField(
                      "Loan Term",
                      "LoanTerm",
                      newLoanRecord.LoanTerm,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      LOAN_TERMS
                    )}
                  </Col>
                  <Col span={12}>
                    {renderField(
                      "Payment Mode",
                      "PaymentMode",
                      newLoanRecord.PaymentMode,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      PAYMENT_MODES
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    {renderField(
                      "Collector Name",
                      "CollectorName",
                      newLoanRecord.CollectorName,
                      "select",
                      handleNewLoanRecordChange,
                      false,
                      collectors.map((collector) => collector.Name)
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={12}>
              <Card
                title="Loan Collection Date"
                size="small"
                style={{ marginBottom: 16, minHeight: "200px" }}
              >
                {renderField(
                  "Start Payment Date",
                  "StartPaymentDate",
                  newLoanRecord.StartPaymentDate,
                  "date",
                  handleNewLoanRecordChange
                )}
                {renderField(
                  "Maturity Date",
                  "MaturityDate",
                  newLoanRecord.MaturityDate,
                  "date",
                  handleNewLoanRecordChange
                )}
              </Card>
            </Col>
          </Row>
        </>
      </Modal>

      <Modal
        title="Edit Loan Record"
        open={isEditLoanRecordModalVisible}
        onCancel={() => setIsEditLoanRecordModalVisible(false)}
        onOk={handleUpdateLoanRecord}
        width={800}
        className="compact-modal"
      >
        {editingLoanRecord && (
          <>
            <Row gutter={16} align="stretch">
              <Col span={12}>
                <Card
                  title="Loan Details"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "235px" }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan No",
                        "LoanNo",
                        editingLoanRecord.LoanNo,
                        "text",
                        handleEditLoanRecordChange,
                        !(
                          hasTwoCycles &&
                          String(editingLoanRecord?.LoanType) === "Renewal"
                        ) // Allow editing only for Renewal with >=2 cycles
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Loan Type",
                        "LoanType",
                        editingLoanRecord.LoanType,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_TYPES
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Status",
                        "LoanStatus",
                        editingLoanRecord.LoanStatus,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_STATUSES
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Loan Process Status",
                        "LoanProcessStatus",
                        editingLoanRecord.LoanProcessStatus,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_PROCESS_STATUSES
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      {renderField(
                        "Remarks",
                        "Remarks",
                        editingLoanRecord.Remarks,
                        "text",
                        handleEditLoanRecordChange,
                        false
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={12}>
                <Card
                  title="Loan Amount Details"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "235px" }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Amount",
                        "LoanAmount",
                        editingLoanRecord.LoanAmount,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Principal Amount",
                        "PrincipalAmount",
                        editingLoanRecord.PrincipalAmount,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Balance",
                        "LoanBalance",
                        editingLoanRecord.LoanBalance,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Loan Interest",
                        "LoanInterest",
                        editingLoanRecord.LoanInterest,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Penalty",
                        "Penalty",
                        editingLoanRecord.Penalty,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Amortization",
                        "LoanAmortization",
                        editingLoanRecord.LoanAmortization,
                        "number",
                        handleEditLoanRecordChange
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <Row gutter={16} align="stretch">
              <Col span={12}>
                <Card
                  title="Terms and Payments"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "200px" }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      {renderField(
                        "Loan Term",
                        "LoanTerm",
                        editingLoanRecord.LoanTerm,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        LOAN_TERMS
                      )}
                    </Col>
                    <Col span={12}>
                      {renderField(
                        "Payment Mode",
                        "PaymentMode",
                        editingLoanRecord.PaymentMode,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        PAYMENT_MODES
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      {renderField(
                        "Collector Name",
                        "CollectorName",
                        editingLoanRecord.CollectorName,
                        "select",
                        handleEditLoanRecordChange,
                        false,
                        collectors.map((collector) => collector.Name)
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={12}>
                <Card
                  title="Loan Collection Date"
                  size="small"
                  style={{ marginBottom: 16, minHeight: "200px" }}
                >
                  {renderField(
                    "Start Payment Date",
                    "StartPaymentDate",
                    editingLoanRecord.StartPaymentDate,
                    "date",
                    handleEditLoanRecordChange
                  )}
                  {renderField(
                    "Maturity Date",
                    "MaturityDate",
                    editingLoanRecord.MaturityDate,
                    "date",
                    handleEditLoanRecordChange
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal>

      <Modal
        open={isLoanRateModalVisible}
        className="compact-modal"
        footer={null}
        width={isTablet ? 800 : 1100}
        onCancel={() => setIsLoanRateModalVisible(false)}
      >
        <LoanRateConfig isModal={true} onSelect={handleImportLoanRate} />
      </Modal>
    </Modal>
  );
}
