import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Space,
  Button,
  Input,
  Typography,
  message,
  Modal,
  Upload,
  Tabs,
  List,
  Popconfirm,
  Collapse,
  Select,
  Form,
  Row,
  Col,
  Dropdown,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  InboxOutlined,
  ImportOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  DownOutlined,
  CheckCircleFilled, // ✅ IMPORT THE ICON
} from "@ant-design/icons";
import api from "../../utils/axios";
import dayjs from "dayjs";
import "./collections.css";
import AddCollectionModal from "./components/AddCollectionModal";
import EditCollectionModal from "./components/EditCollectionModal";
import { exportData } from "../../utils/exportUtils";

const { Dragger } = Upload;
const { TabPane } = Tabs;
const { Option } = Select;

const Collections = ({ loan }) => {
  const [form] = Form.useForm();

  // Full list and visible page slice
  const [allCollections, setAllCollections] = useState([]);
  const [collections, setCollections] = useState([]);

  // Loading & pagination & filters
  const [loading, setLoading] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({ q: "", paymentDate: null });

  // Modals & parsed upload state
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [parsedCollections, setParsedCollections] = useState([]);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [rawLines, setRawLines] = useState([]);
  const [headerInfo, setHeaderInfo] = useState({});
  const [hasImportedCollections, setHasImportedCollections] = useState(false);

  // Selections / collectors
  const [selectedMainTableRowKeys, setSelectedMainTableRowKeys] = useState(
    []
  );
  const [isUpdateCollectorModalVisible, setIsUpdateCollectorModalVisible] =
    useState(false);
  const [collectors, setCollectors] = useState([]);

  // Selected loan cycle and loan object
  const [selectedLoanNo, setSelectedLoanNo] = useState(
    loan?.loanInfo?.loanNo || null
  );
  const [selectedLoan, setSelectedLoan] = useState(loan?.loanInfo || null);

  // Penalty inline-edit states
  const [editingPenaltyId, setEditingPenaltyId] = useState(null);
  const [penaltyInputValue, setPenaltyInputValue] = useState("");

  // build loan cycle options from various places in loan prop
  const loanCycleOptions = useMemo(() => {
    const setNo = new Set();
    const out = [];
    if (loan?.loanInfo?.loanNo) {
      setNo.add(loan.loanInfo.loanNo);
      out.push({ loanNo: loan.loanInfo.loanNo, raw: loan.loanInfo });
    }
    if (Array.isArray(loan?.allClientLoans)) {
      loan.allClientLoans.forEach((l) => {
        const value = l?.loanInfo?.loanNo || l?.LoanNo || l?.LoanCycleNo;
        if (value && !setNo.has(value)) {
          setNo.add(value);
          out.push({ loanNo: value, raw: l });
        }
      });
    }
    if (Array.isArray(loan?.cycles)) {
      loan.cycles.forEach((c) => {
        const value = c?.loanNo || c?.LoanCycleNo;
        if (value && !setNo.has(value)) {
          setNo.add(value);
          out.push({ loanNo: value, raw: c });
        }
      });
    }
    return out;
  }, [loan]);

  // keep selectedLoan / selectedLoanNo synced when parent loan prop changes
  useEffect(() => {
    if (!selectedLoanNo && loan?.loanInfo?.loanNo) {
      setSelectedLoanNo(loan.loanInfo.loanNo);
      setSelectedLoan(loan.loanInfo);
    } else if (selectedLoanNo) {
      const found =
        (loan?.allClientLoans || []).find(
          (l) =>
            l.loanInfo?.loanNo === selectedLoanNo ||
            l.LoanCycleNo === selectedLoanNo ||
            l.LoanNo === selectedLoanNo
        ) || null;
      if (found) {
        setSelectedLoan(found.loanInfo ? found.loanInfo : found);
      } else if (loan?.loanInfo?.loanNo === selectedLoanNo) {
        setSelectedLoan(loan.loanInfo);
      } else {
        setSelectedLoan({ loanNo: selectedLoanNo });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan]);

  // fetch collectors once
  useEffect(() => {
    api
      .get("/collectors")
      .then((res) => {
        if (res.data.success) setCollectors(res.data.data);
      })
      .catch((err) => console.error("Failed to load collectors", err));
  }, []);

  // central fetchCollections - uses exact loanNo, dedupes, converts Decimal values where needed
  const fetchCollections = useCallback(
    async (loanNo = selectedLoanNo) => {
      if (!loanNo) {
        setAllCollections([]);
        setCollections([]);
        setPagination((p) => ({ ...p, total: 0 }));
        return;
      }

      try {
        setLoading(true);
        setLoadingCollections(true);
        const res = await api.get(`/loan-collections/${loanNo}`, {
          params: { limit: 0 },
        });

        if (res.data && res.data.success) {
          // dedupe
          const seen = new Set();
          const unique = [];
          (res.data.data || []).forEach((item) => {
            const key =
              item._id ||
              `${item.CollectionReferenceNo || ""}-${item.PaymentDate || ""}-${
                item.CollectionPayment || ""
              }`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(item);
            }
          });

          // prepend disbursement row (non-editable)
          const disbursementRecord =
            selectedLoan && (selectedLoan.startDate || selectedLoan.releaseDate)
              ? {
                  _id: `disbursement-${loanNo}`,
                  PaymentDate:
                    selectedLoan.startDate || selectedLoan.releaseDate || null,
                  CollectionReferenceNo: "Disbursement",
                  CollectionPayment: 0,
                  RunningBalance:
                    selectedLoan.amount ||
                    selectedLoan.LoanAmount ||
                    selectedLoan.loanAmount ||
                    0,
                  Penalty: 0,
                  CollectorName: selectedLoan?.CollectorName || "-",
                  isDisbursement: true,
                }
              : null;

          const finalList = disbursementRecord ? [disbursementRecord, ...unique] : unique;

          setAllCollections(finalList);
          setHasImportedCollections(finalList.some((c) => c.Source === "imported"));
          setPagination((p) => ({ ...p, total: finalList.length }));
        } else {
          setAllCollections([]);
          setPagination((p) => ({ ...p, total: 0 }));
        }
      } catch (err) {
        console.error("Error fetching collections:", err);
        message.error("Error fetching collections.");
        setAllCollections([]);
        setPagination((p) => ({ ...p, total: 0 }));
      } finally {
        setLoading(false);
        setLoadingCollections(false);
      }
    },
    [selectedLoan]
  );

  // when user changes selectedLoanNo, set selectedLoan and fetch
  useEffect(() => {
    if (selectedLoanNo) {
      // find matching loan object if available
      const found =
        (loan?.allClientLoans || []).find(
          (l) =>
            l.loanInfo?.loanNo === selectedLoanNo ||
            l.LoanCycleNo === selectedLoanNo ||
            l.LoanNo === selectedLoanNo
        ) || null;
      if (found) {
        setSelectedLoan(found.loanInfo ? found.loanInfo : found);
      } else if (loan?.loanInfo?.loanNo === selectedLoanNo) {
        setSelectedLoan(loan.loanInfo);
      } else {
        setSelectedLoan({ loanNo: selectedLoanNo });
      }

      // fetch and reset to first page
      fetchCollections(selectedLoanNo);
      setPagination((p) => ({ ...p, current: 1 }));
    } else {
      setAllCollections([]);
      setCollections([]);
      setPagination((p) => ({ ...p, total: 0 }));
    }
  }, [selectedLoanNo, fetchCollections, loan]);

  // keep visible page in sync with allCollections, pagination, filters
  useEffect(() => {
    let filtered = allCollections;

    if (filters.q) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          String(c.CollectionReferenceNo || "").toLowerCase().includes(q) ||
          String(c.CollectorName || "").toLowerCase().includes(q)
      );
    }
    if (filters.paymentDate) {
      filtered = filtered.filter((c) =>
        dayjs(c.PaymentDate).isSame(filters.paymentDate, "day")
      );
    }

    setPagination((prev) => ({ ...prev, total: filtered.length }));

    const start = (pagination.current - 1) * pagination.pageSize;
    const end = pagination.current * pagination.pageSize;
    setCollections(filtered.slice(start, end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCollections, pagination.current, pagination.pageSize, filters]);

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // Save parsed collections to metadata
  const handleSaveParsedCollections = async () => {
    const selected = parsedCollections.filter((_, i) => selectedRowKeys.includes(i));
    if (selected.length === 0) {
      message.warning("Please select at least one record to save.");
      return;
    }
    try {
      await api.post(`/loan-collections/import/${selectedLoan?.loanNo || selectedLoanNo}`, {
        data: selected,
      });
      message.success("Collections saved to metadata!");
      setIsPreviewModalVisible(false);
      fetchCollections(selectedLoan?.loanNo || selectedLoanNo);
    } catch (err) {
      console.error(err);
      message.error("Failed to save collections.");
    }
  };

  // commit import
  const handleImportCollections = async () => {
    try {
      const res = await api.post(`/loan-collections/commit/${selectedLoan?.loanNo || selectedLoanNo}`);
      if (res.data.success) {
        message.success("Collections imported successfully!");
        fetchCollections(selectedLoan?.loanNo || selectedLoanNo);
      } else {
        message.warning(res.data.message || "Nothing to import.");
      }
    } catch (err) {
      console.error(err);
      message.error("Import failed.");
    }
  };

  // delete
  const handleDeleteCollection = async (record) => {
    try {
      await api.delete(`/loan-collections/${record._id}`);
      message.success("Collection deleted successfully.");
      // Remove locally and refresh pagination slice
      setAllCollections((prev) => prev.filter((c) => c._id !== record._id));
      // adjust total
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } catch (error) {
      console.error("Error deleting collection:", error);
      message.error("Failed to delete collection.");
    }
  };

  // bulk update collector
  const handleUpdateCollector = async () => {
    try {
      const values = await form.validateFields();
      await api.patch("/loan-collections/bulk-update", {
        ids: selectedMainTableRowKeys,
        updates: { CollectorName: values.collectorName },
      });
      message.success("Collector updated successfully for selected collections.");
      setIsUpdateCollectorModalVisible(false);
      setSelectedMainTableRowKeys([]);
      fetchCollections(selectedLoan?.loanNo || selectedLoanNo);
    } catch (error) {
      console.error("Error updating collector:", error);
      message.error("Failed to update collector.");
    }
  };

  // export
  const handleExport = (type) => {
    exportData(allCollections, {
      type,
      title: "Loan Collections Report",
      metadata: {
        name: `${loan?.person?.firstName || ""} ${loan?.person?.lastName || ""}`,
        address: loan?.address,
        contact: loan?.person?.ContactNumber,
        loanNo: selectedLoan?.loanNo || selectedLoanNo,
        collector: allCollections[0]?.CollectorName || "",
      },
      columns: [
        { key: "PaymentDate", header: "Date", format: (v) => (v ? dayjs(v).format("MM/DD/YYYY") : "") },
        { key: "CollectionReferenceNo", header: "Ref No" },
        { key: "CollectionPayment", header: "Payment", format: (v) => `₱${parseFloat(v || 0).toLocaleString()}`, total: true },
        { key: "RunningBalance", header: "Balance", format: (v) => `₱${parseFloat(v || 0).toLocaleString()}` },
        { key: "Penalty", header: "Penalty", format: (v) => `₱${parseFloat(v || 0).toLocaleString()}` },
        { key: "CollectorName", header: "Collector" },
      ],
      includeTotals: true,
    });
  };

  // summary
  const collectionSummary = useMemo(() => {
    const actualCollections = allCollections.filter((c) => !c.isDisbursement);
    const totalCollections = actualCollections.length;
    const totalAmountCollected = actualCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.CollectionPayment || 0),
      0
    );
    const totalPenalty = actualCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.Penalty || 0),
      0
    );
    const lastCollection = allCollections[allCollections.length - 1];
    const remainingBalance = lastCollection
      ? lastCollection.RunningBalance
      : selectedLoan?.amount || selectedLoan?.LoanAmount || 0;
    return {
      totalCollections,
      totalAmountCollected,
      totalPenalty,
      remainingBalance,
      loanAmount: selectedLoan?.amount || selectedLoan?.LoanAmount || loan?.loanInfo?.amount || 0,
    };
  }, [allCollections, selectedLoan, loan]);

  // row selection objects
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };
  const mainTableRowSelection = {
    selectedRowKeys: selectedMainTableRowKeys,
    onChange: (keys) => setSelectedMainTableRowKeys(keys),
    getCheckboxProps: (record) => ({ disabled: record.isDisbursement, name: record.CollectionReferenceNo }),
  };

  // PENALTY save handler
  const handlePenaltySave = async (recordId) => {
    try {
      const penaltyValue = parseFloat(penaltyInputValue) || 0;
      await api.patch(`/loan-collections/${recordId}`, { Penalty: penaltyValue });
      message.success("Penalty updated");
      setEditingPenaltyId(null);
      setPenaltyInputValue("");
      // refresh collections for consistent state
      fetchCollections(selectedLoanNo);
    } catch (err) {
      console.error("Error updating penalty:", err);
      message.error("Failed to update penalty");
    }
  };

  // table columns with inline editable Penalty
  const columns = [
    {
      title: "Date",
      dataIndex: "PaymentDate",
      render: (d) => (d ? dayjs(d).format("MM/DD/YYYY") : ""),
    },
    { title: "Ref No", dataIndex: "CollectionReferenceNo" },
    {
      title: "Payment",
      dataIndex: "CollectionPayment",
      render: (v, record) =>
        record.isDisbursement ? `₱${parseFloat(0).toLocaleString()}` : `₱${parseFloat(v || 0).toLocaleString()}`,
    },
    {
      title: "Balance",
      dataIndex: "RunningBalance",
      render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
    },
    {
      title: "Penalty",
      dataIndex: "Penalty",
      render: (value, record) => {
        if (record.isDisbursement) return `₱0.00`;
        if (editingPenaltyId === record._id) {
          return (
            <Input
              size="small"
              style={{ width: 100 }}
              autoFocus
              value={penaltyInputValue}
              onChange={(e) => setPenaltyInputValue(e.target.value)}
              onPressEnter={() => handlePenaltySave(record._id)}
              onBlur={() => handlePenaltySave(record._id)}
            />
          );
        }
        return (
          <div
            style={{ cursor: "pointer", minWidth: 80 }}
            onClick={() => {
              setEditingPenaltyId(record._id);
              setPenaltyInputValue(value ? String(parseFloat(value)) : "");
            }}
          >
            ₱{parseFloat(value || 0).toLocaleString()}
          </div>
        );
      },
    },
    { title: "Collector", dataIndex: "CollectorName" },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        record.isDisbursement ? null : (
          <Space size="small">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCollection(record);
                setIsEditModalVisible(true);
              }}
              size="small"
            />
            <Popconfirm
              title="Are you sure you want to delete this collection?"
              onConfirm={() => handleDeleteCollection(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  const tableData = useMemo(() => collections, [collections]);

  // summary small tables
  const summaryColumns = [
    { title: "Label", dataIndex: "label", key: "label" },
    { title: "Value", dataIndex: "value", key: "value", align: "right" },
  ];
  const summaryDataLeft = [
    { key: "loanAmount", label: "Loan Amount", value: `₱${parseFloat(collectionSummary.loanAmount || 0).toLocaleString()}` },
    // ✅ ADDED VISUAL INDICATOR FOR ENCODED COLLECTIONS
    { 
      key: "totalCollections", 
      label: (
        <span>
          Total Collections
          {collectionSummary.totalCollections > 0 && 
            <CheckCircleFilled style={{ marginLeft: 8, color: '#52c41a' }} />
          }
        </span>
      ), 
      value: collectionSummary.totalCollections 
    },
    { key: "totalCollected", label: "Total Collected", value: `₱${parseFloat(collectionSummary.totalAmountCollected || 0).toLocaleString()}` },
  ];
  const summaryDataRight = [
    { key: "totalPenalty", label: "Total Penalty", value: `₱${parseFloat(collectionSummary.totalPenalty || 0).toLocaleString()}` },
    { key: "remainingBalance", label: "Remaining Balance", value: `₱${parseFloat(collectionSummary.remainingBalance || 0).toLocaleString()}` },
  ];

  return (
    <div className="collections-container">
      <h2>
        Collections for {loan?.person?.firstName} {loan?.person?.middleName}{" "}
        {loan?.person?.lastName} (Loan No: {selectedLoan?.loanNo || selectedLoanNo || "N/A"})
      </h2>

      {/* Collapse summary — always open and not collapsed when interacting with the dropdown */}
      <Collapse
        defaultActiveKey={["1"]}
        collapsible="icon"
        style={{ marginBottom: 12 }}
        items={[
          {
            key: "1",
            label: (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Collection Summary</span>
                <Select
                  value={selectedLoanNo}
                  style={{ width: 260 }}
                  onChange={(val) => setSelectedLoanNo(val)}
                  placeholder="Select Loan No"
                  size="small"
                  options={loanCycleOptions.map((o) => ({ value: o.loanNo, label: o.loanNo }))}
                />
              </div>
            ),
            children: (
              <Row gutter={16}>
                <Col span={12}>
                  <Table columns={summaryColumns} dataSource={summaryDataLeft} pagination={false} showHeader={false} bordered={false} size="small" />
                </Col>
                <Col span={12}>
                  <Table columns={summaryColumns} dataSource={summaryDataRight} pagination={false} showHeader={false} bordered={false} size="small" />
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* Top controls (kept intact) */}
      <div className="collections-filters" style={{ marginBottom: 12 }}>
        <Input
          placeholder="Search..."
          style={{ width: 200 }}
          size="small"
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          suffix={<SearchOutlined onClick={() => fetchCollections(selectedLoanNo)} style={{ color: "rgba(0,0,0,.45)" }} />}
        />
        <div style={{ flexGrow: 1 }} />
        {selectedMainTableRowKeys.length > 0 && (
          <Button style={{ marginRight: 8 }} onClick={() => setIsUpdateCollectorModalVisible(true)}>
            Update Collector ({selectedMainTableRowKeys.length})
          </Button>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalVisible(true)}>
          Add Collection
        </Button>
        <Button style={{ background: "green", color: "white", marginLeft: 8 }} icon={<UploadOutlined />} onClick={() => setIsUploadModalVisible(true)}>
          Upload File
        </Button>
        <Button style={{ background: "blue", color: "white", marginLeft: 8 }} icon={<ImportOutlined />} onClick={handleImportCollections}>
          {hasImportedCollections ? "Reimport Data" : "Import Collections"}
        </Button>
        <Dropdown
          menu={{
            onClick: ({ key }) => handleExport(key),
            items: [
              { key: "excel", label: "Export as Excel", icon: <FileExcelOutlined /> },
              { key: "pdf", label: "Export as PDF", icon: <FilePdfOutlined /> },
            ],
          }}
        >
          <Button style={{ marginLeft: 8 }}>
            Export <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      {/* Main Table */}
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey={(r) => r._id || `${r.CollectionReferenceNo}-${r.PaymentDate}`}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
        onChange={handleTableChange}
        rowSelection={mainTableRowSelection}
      />

      {/* Upload Modal */}
      <Modal title="Upload Collection File" open={isUploadModalVisible} onCancel={() => setIsUploadModalVisible(false)} footer={null}>
        <Dragger
          multiple={false}
          showUploadList={false}
          beforeUpload={async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            try {
              const res = await api.post("/parse/word", formData, { headers: { "Content-Type": "multipart/form-data" } });
              if (res.data.success) {
                const parsed = res.data.data || [];
                const lines = res.data.rawLines || [];
                const info = res.data.info || {};
                if (!parsed.length) {
                  message.warning("No collection data found in the file.");
                  return Upload.LIST_IGNORE;
                }
                setParsedCollections(parsed);
                setRawLines(lines);
                setHeaderInfo(info);
                setSelectedRowKeys(parsed.map((_, i) => i));
                setIsUploadModalVisible(false);
                setIsPreviewModalVisible(true);
                message.success("File parsed successfully!");
              } else {
                message.error("Parsing failed.");
              }
            } catch (err) {
              console.error(err);
              message.error("Upload or parse failed.");
            }
            return Upload.LIST_IGNORE;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag Word (.doc / .docx) file here</p>
        </Dragger>
      </Modal>

      {/* Preview Modal */}
      <Modal title="Preview Parsed Collections" open={isPreviewModalVisible} onCancel={() => setIsPreviewModalVisible(false)} width={900} okText="Save Selected" onOk={handleSaveParsedCollections}>
        {headerInfo && Object.keys(headerInfo).length > 0 && (
          <div style={{ marginBottom: 16, background: "#fafafa", padding: 12, borderRadius: 8 }}>
            <h4>📄 File Info</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {headerInfo.Name && <p><b>Name:</b> {headerInfo.Name}</p>}
              {headerInfo.AccountNumber && <p><b>Account No:</b> {headerInfo.AccountNumber}</p>}
              {headerInfo.Address && <p><b>Address:</b> {headerInfo.Address}</p>}
              {headerInfo.Collector && <p><b>Collector:</b> {headerInfo.Collector}</p>}
            </div>
          </div>
        )}

        <Tabs defaultActiveKey="1">
          <TabPane tab="Parsed Collections" key="1">
            <Table
              size="small"
              dataSource={parsedCollections}
              rowKey={(_, i) => i}
              pagination={true}
              rowSelection={rowSelection}
              columns={[
                { title: "Date", dataIndex: "PaymentDate", render: (d) => dayjs(d).format("MM/DD/YYYY") },
                { title: "Ref No", dataIndex: "CollectionReferenceNo" },
                { title: "Payment", dataIndex: "CollectionPayment", render: (v) => `₱${parseFloat(v || 0).toLocaleString()}` },
                { title: "Balance", dataIndex: "RunningBalance", render: (v) => `₱${parseFloat(v || 0).toLocaleString()}` },
                { title: "Penalty", dataIndex: "Penalty", render: (v) => `₱${parseFloat(v || 0).toLocaleString()}` },
              ]}
              scroll={{ y: 400 }}
            />
          </TabPane>

          <TabPane tab="Raw Extracted Lines" key="2">
            <List bordered size="small" dataSource={rawLines} style={{ maxHeight: 400, overflowY: "auto" }} renderItem={(line) => <List.Item>{line}</List.Item>} />
          </TabPane>

          <TabPane tab="Raw JSON" key="3">
            <pre style={{ maxHeight: 400, overflow: "auto", background: "#f5f5f5", padding: "8px" }}>{JSON.stringify(parsedCollections, null, 2)}</pre>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Add Collection Modal */}
      <AddCollectionModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          fetchCollections(selectedLoan?.loanNo || selectedLoanNo);
        }}
        loan={{ ...loan, loanInfo: selectedLoan || { loanNo: selectedLoanNo } }}
      />

      {/* Edit Collection Modal */}
      {editingCollection && (
        <EditCollectionModal
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setEditingCollection(null);
          }}
          onSuccess={() => {
            setIsEditModalVisible(false);
            setEditingCollection(null);
            fetchCollections(selectedLoan?.loanNo || selectedLoanNo);
          }}
          collectionData={editingCollection}
          loan={{ ...loan, loanInfo: selectedLoan || { loanNo: selectedLoanNo } }}
        />
      )}

      {/* Update Collector Modal */}
      <Modal title="Update Collector" open={isUpdateCollectorModalVisible} onCancel={() => setIsUpdateCollectorModalVisible(false)} onOk={handleUpdateCollector} okText="Update">
        <Form form={form} layout="vertical">
          <Form.Item name="collectorName" label="Collector" rules={[{ required: true, message: "Please select a collector" }]}>
            <Select placeholder="Select a new collector">
              {collectors.map((collector) => (<Option key={collector._id} value={collector.Name}>{collector.Name}</Option>))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Collections;