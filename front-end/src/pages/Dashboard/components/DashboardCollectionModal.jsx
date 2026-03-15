import React, { useState, useCallback } from "react";
import {
  Modal,
  Tabs,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  Upload,
  Table,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Alert,
  Divider,
  Tooltip,
  AutoComplete,
} from "antd";
import {
  UploadOutlined,
  InboxOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import { swalMessage } from "../../../utils/swal";

const { Dragger } = Upload;
const { Text, Title } = Typography;
const { Option } = Select;

const DashboardCollectionModal = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState("upload");
  const [loading, setLoading] = useState(false);

  // File Upload state
  const [parsedData, setParsedData] = useState([]);
  const [headerInfo, setHeaderInfo] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);

  // Manual Entry state
  const [manualEntries, setManualEntries] = useState([createEmptyEntry()]);
  const [clientOptions, setClientOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [collectors, setCollectors] = useState([]);

  function createEmptyEntry() {
    return {
      key: Date.now() + Math.random(),
      clientSearch: "",
      AccountId: "",
      ClientNo: "",
      LoanCycleNo: "",
      clientName: "",
      PaymentDate: dayjs(),
      CollectionPayment: null,
      CollectorName: "",
      PaymentVia: "Cash",
      Remarks: "",
      matched: false,
      loanCycles: [],
    };
  }

  // Search clients by name
  const handleClientSearch = useCallback(
    async (value, index) => {
      const trimmed = (value || "").trim();
      if (trimmed.length < 2) {
        setClientOptions([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await api.get("/loan-collections/search-clients", {
          params: { q: trimmed, limit: 10 },
        });
        if (res.data?.success) {
          setClientOptions(
            res.data.data.map((c) => ({
              value: c.fullName,
              label: (
                <div>
                  <Text strong>{c.fullName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Account: {c.AccountId} | Client: {c.ClientNo}
                    {c.loanCycles?.length > 0 &&
                      ` | Loans: ${c.loanCycles.map((l) => l.LoanCycleNo).join(", ")}`}
                  </Text>
                </div>
              ),
              client: c,
            }))
          );
        }
      } catch {
        // silent
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  // When a client is selected from autocomplete
  const handleClientSelect = (value, option, index) => {
    const client = option.client;
    setManualEntries((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        clientSearch: value,
        AccountId: client.AccountId,
        ClientNo: client.ClientNo,
        clientName: client.fullName,
        matched: true,
        loanCycles: client.loanCycles || [],
        LoanCycleNo: client.loanCycles?.[0]?.LoanCycleNo || "",
      };
      return updated;
    });
  };

  // Update a manual entry field
  const updateEntry = (index, field, value) => {
    setManualEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add a new empty row
  const addRow = () => {
    setManualEntries((prev) => [...prev, createEmptyEntry()]);
  };

  // Remove a row
  const removeRow = (index) => {
    setManualEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle file upload (Word/CSV)
  const handleFileUpload = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const endpoint = ext === "csv" ? "/parse/csv" : "/parse/word";

    if (!["docx", "csv"].includes(ext)) {
      swalMessage.error("Please upload a .docx or .csv file");
      return false;
    }

    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const parsed = (res.data.data || []).map((item, i) => ({
          ...item,
          key: i,
        }));
        setParsedData(parsed);
        setHeaderInfo(res.data.info || {});
        setSelectedRowKeys(parsed.map((_, i) => i));
        swalMessage.success(
          `Parsed ${parsed.length} collection records from file`
        );
      } else {
        swalMessage.error(res.data?.message || "Failed to parse file");
      }
    } catch (err) {
      swalMessage.error("Failed to upload and parse file");
    } finally {
      setFileUploading(false);
    }
    return false; // prevent default upload
  };

  // Commit parsed file collections
  const handleCommitParsed = async () => {
    if (!headerInfo.AccountNumber) {
      swalMessage.error(
        "No account number detected in the file. Cannot import."
      );
      return;
    }

    const selected = parsedData.filter((_, i) => selectedRowKeys.includes(i));
    if (selected.length === 0) {
      swalMessage.error("No collections selected");
      return;
    }

    setLoading(true);
    try {
      // Save to metadata first
      const saveRes = await api.post(
        `/loan-collections/import/${headerInfo.AccountNumber}`,
        { data: selected }
      );
      if (!saveRes.data?.success) {
        swalMessage.error(saveRes.data?.message || "Failed to save");
        return;
      }

      // Then commit
      const commitRes = await api.post(
        `/loan-collections/commit/${headerInfo.AccountNumber}`
      );
      if (commitRes.data?.success) {
        swalMessage.success(commitRes.data.message || "Collections imported");
        setParsedData([]);
        setHeaderInfo({});
        setSelectedRowKeys([]);
        onClose();
      } else {
        swalMessage.error(commitRes.data?.message || "Failed to commit");
      }
    } catch (err) {
      swalMessage.error("Failed to import collections");
    } finally {
      setLoading(false);
    }
  };

  // Submit manual entries
  const handleSubmitManual = async () => {
    const valid = manualEntries.filter(
      (e) =>
        e.matched &&
        e.AccountId &&
        e.ClientNo &&
        e.LoanCycleNo &&
        e.CollectionPayment > 0
    );

    if (valid.length === 0) {
      swalMessage.error(
        "No valid entries. Make sure each entry has a matched client, a selected loan, and a payment amount."
      );
      return;
    }

    setLoading(true);
    try {
      const collections = valid.map((e) => ({
        AccountId: e.AccountId,
        ClientNo: e.ClientNo,
        LoanCycleNo: e.LoanCycleNo,
        PaymentDate: e.PaymentDate ? e.PaymentDate.toISOString() : new Date().toISOString(),
        CollectionPayment: e.CollectionPayment,
        CollectorName: e.CollectorName,
        PaymentVia: e.PaymentVia,
        Remarks: e.Remarks,
        DateReceived: new Date().toISOString(),
        DateProcessed: new Date().toISOString(),
      }));

      const res = await api.post("/loan-collections/bulk-add", { collections });
      if (res.data?.success) {
        const { inserted, errors } = res.data.data;
        swalMessage.success(
          `${inserted} collection(s) added successfully${errors > 0 ? `. ${errors} had errors.` : ""}`
        );
        setManualEntries([createEmptyEntry()]);
        onClose();
      } else {
        swalMessage.error(res.data?.message || "Failed to add collections");
      }
    } catch (err) {
      swalMessage.error("Failed to add collections");
    } finally {
      setLoading(false);
    }
  };

  // Fetch collectors for dropdown
  const fetchCollectors = useCallback(async () => {
    try {
      const res = await api.get("/collectors");
      if (res.data?.success) {
        setCollectors(
          res.data.data.map((c) => c.CollectorName || c.Name || c.name || "Unknown")
        );
      }
    } catch {
      // silent
    }
  }, []);

  React.useEffect(() => {
    if (visible) fetchCollectors();
  }, [visible, fetchCollectors]);

  const formatCurrency = (val) => {
    const n = Number(val ?? 0);
    return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Parsed file table columns
  const parsedColumns = [
    {
      title: "Date",
      dataIndex: "PaymentDate",
      width: 110,
      render: (v) => (v ? dayjs(v).format("MM/DD/YYYY") : "-"),
    },
    { title: "Ref No", dataIndex: "CollectionReferenceNo", width: 100 },
    {
      title: "Payment",
      dataIndex: "CollectionPayment",
      width: 120,
      render: (v) => formatCurrency(v),
    },
    {
      title: "Balance",
      dataIndex: "RunningBalance",
      width: 120,
      render: (v) => formatCurrency(v),
    },
    {
      title: "Penalty",
      dataIndex: "Penalty",
      width: 100,
      render: (v) => formatCurrency(v),
    },
  ];

  const uploadTab = (
    <div>
      <Alert
        message="Upload a collection file (.docx or .csv) to auto-detect accounts and parse payment records."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Dragger
        accept=".docx,.csv"
        beforeUpload={handleFileUpload}
        showUploadList={false}
        disabled={fileUploading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag file to upload
        </p>
        <p className="ant-upload-hint">
          Supports .docx and .csv files
        </p>
      </Dragger>

      {parsedData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {headerInfo.Name && (
            <div style={{ marginBottom: 8 }}>
              <Text strong>Client: </Text>
              <Text>{headerInfo.Name}</Text>
              {headerInfo.AccountNumber && (
                <>
                  <Text strong style={{ marginLeft: 16 }}>
                    Account:{" "}
                  </Text>
                  <Text>{headerInfo.AccountNumber}</Text>
                </>
              )}
              {headerInfo.Collector && (
                <>
                  <Text strong style={{ marginLeft: 16 }}>
                    Collector:{" "}
                  </Text>
                  <Text>{headerInfo.Collector}</Text>
                </>
              )}
            </div>
          )}
          <Table
            dataSource={parsedData}
            columns={parsedColumns}
            size="small"
            pagination={false}
            scroll={{ y: 250 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
          />
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <Text type="secondary" style={{ marginRight: 16 }}>
              {selectedRowKeys.length} of {parsedData.length} selected
            </Text>
            <Button
              type="primary"
              onClick={handleCommitParsed}
              loading={loading}
              disabled={selectedRowKeys.length === 0}
            >
              Import Selected Collections
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const manualTab = (
    <div>
      <Alert
        message="Search for clients by name to detect their loan account, then enter payment details."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      {manualEntries.map((entry, index) => (
        <div
          key={entry.key}
          style={{
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            background: entry.matched ? "#f6ffed" : "#fff",
            position: "relative",
          }}
        >
          {/* Entry number badge */}
          <div style={{ position: "absolute", top: 8, left: 12 }}>
            <Text strong style={{ color: "#999", fontSize: 12 }}>
              #{index + 1}
            </Text>
          </div>
          {manualEntries.length > 1 && (
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeRow(index)}
              />
            </div>
          )}

          {/* Row 1: Client search & Loan selection */}
          <Row gutter={12} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Client Name
              </Text>
              <AutoComplete
                style={{ width: "100%" }}
                options={clientOptions}
                onSearch={(v) => handleClientSearch(v, index)}
                onSelect={(v, opt) => handleClientSelect(v, opt, index)}
                placeholder="Search client name or account..."
                value={entry.clientSearch}
                onChange={(v) => updateEntry(index, "clientSearch", v)}
              />
              {entry.matched && (
                <Tag
                  color="green"
                  icon={<CheckCircleOutlined />}
                  style={{ marginTop: 4 }}
                >
                  {entry.clientName} ({entry.AccountId})
                </Tag>
              )}
            </Col>
            <Col xs={24} sm={6}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Loan Cycle
              </Text>
              {entry.loanCycles.length > 0 ? (
                <Select
                  style={{ width: "100%" }}
                  value={entry.LoanCycleNo}
                  onChange={(v) => updateEntry(index, "LoanCycleNo", v)}
                  placeholder="Select loan"
                >
                  {entry.loanCycles.map((lc) => (
                    <Option key={lc.LoanCycleNo} value={lc.LoanCycleNo}>
                      {lc.LoanCycleNo}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder="Loan Cycle No"
                  value={entry.LoanCycleNo}
                  onChange={(e) =>
                    updateEntry(index, "LoanCycleNo", e.target.value)
                  }
                />
              )}
            </Col>
            <Col xs={24} sm={6}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Payment Date
              </Text>
              <DatePicker
                style={{ width: "100%" }}
                value={entry.PaymentDate}
                onChange={(d) => updateEntry(index, "PaymentDate", d)}
                format="MM/DD/YYYY"
              />
            </Col>
          </Row>

          {/* Row 2: Payment details */}
          <Row gutter={12} style={{ marginTop: 12 }}>
            <Col xs={24} sm={5}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Amount
              </Text>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="0.00"
                min={0}
                value={entry.CollectionPayment}
                onChange={(v) => updateEntry(index, "CollectionPayment", v)}
                formatter={(v) =>
                  v ? `₱ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
                }
                parser={(v) => v.replace(/₱\s?|(,*)/g, "")}
              />
            </Col>
            <Col xs={24} sm={5}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Collector
              </Text>
              <Select
                style={{ width: "100%" }}
                placeholder="Select collector"
                value={entry.CollectorName || undefined}
                onChange={(v) => updateEntry(index, "CollectorName", v)}
                allowClear
                showSearch
              >
                {collectors.map((c) => (
                  <Option key={c} value={c}>
                    {c}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Payment Via
              </Text>
              <Select
                style={{ width: "100%" }}
                value={entry.PaymentVia}
                onChange={(v) => updateEntry(index, "PaymentVia", v)}
              >
                <Option value="Cash">Cash</Option>
                <Option value="Online">Online</Option>
                <Option value="Bank">Bank</Option>
                <Option value="Check">Check</Option>
              </Select>
            </Col>
            <Col xs={24} sm={10}>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                Remarks
              </Text>
              <Input
                placeholder="Optional remarks..."
                value={entry.Remarks}
                onChange={(e) => updateEntry(index, "Remarks", e.target.value)}
              />
            </Col>
          </Row>
        </div>
      ))}
      <Space style={{ marginTop: 8 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          Add Row
        </Button>
        <Button
          type="primary"
          onClick={handleSubmitManual}
          loading={loading}
          disabled={!manualEntries.some((e) => e.matched && e.CollectionPayment > 0)}
        >
          Submit Collections
        </Button>
      </Space>
    </div>
  );

  const handleClose = () => {
    setParsedData([]);
    setHeaderInfo({});
    setSelectedRowKeys([]);
    setManualEntries([createEmptyEntry()]);
    setClientOptions([]);
    onClose();
  };

  return (
    <Modal
      title="Add Loan Collections"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane
          tab={
            <span>
              <UploadOutlined /> File Upload
            </span>
          }
          key="upload"
        >
          {uploadTab}
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <span>
              <PlusOutlined /> Manual Entry
            </span>
          }
          key="manual"
        >
          {manualTab}
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};

export default DashboardCollectionModal;
