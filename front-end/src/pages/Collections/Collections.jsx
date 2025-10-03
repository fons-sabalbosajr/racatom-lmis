import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Space,
  Button,
  Input,
  Typography,
  message,
  DatePicker,
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
} from "@ant-design/icons";
import api from "../../utils/axios";
import dayjs from "dayjs";
import "./collections.css";
import AddCollectionModal from "./components/AddCollectionModal";
import EditCollectionModal from "./components/EditCollectionModal";
import { exportData } from "../../utils/exportUtils";

const { Text } = Typography;
const { Dragger } = Upload;
const { TabPane } = Tabs;
const { Option } = Select;

const Collections = ({ loan }) => {
  const [form] = Form.useForm();
  const [collections, setCollections] = useState([]);
  const [allCollections, setAllCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    q: "",
    paymentDate: null,
  });

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

  const [selectedMainTableRowKeys, setSelectedMainTableRowKeys] = useState([]);
  const [isUpdateCollectorModalVisible, setIsUpdateCollectorModalVisible] =
    useState(false);
  const [collectors, setCollectors] = useState([]);

  const fetchCollections = useCallback(() => {
    if (!loan?.loanInfo?.loanNo) {
      setAllCollections([]);
      return;
    }

    setLoading(true);
    api
      .get(`/loan-collections/${loan.loanInfo.loanNo}`, {
        params: { limit: 0 },
      })
      .then((response) => {
        if (response.data.success) {
          setAllCollections(response.data.data);
          const hasImported = response.data.data.some(
            (c) => c.Source === "imported"
          );
          setHasImportedCollections(hasImported);
        } else {
          message.error("Failed to fetch collections.");
        }
      })
      .catch((error) => {
        console.error("Error fetching collections:", error);
        message.error("Error fetching collections.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loan?.loanInfo?.loanNo]);

  useEffect(() => {
    fetchCollections();
    api.get("/collectors").then((res) => {
      if (res.data.success) {
        setCollectors(res.data.data);
      } else {
        message.error("Failed to fetch collector names.");
      }
    });
  }, [fetchCollections]);

  useEffect(() => {
    let filteredData = allCollections;
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filteredData = filteredData.filter(
        (c) =>
          c.CollectionReferenceNo?.toLowerCase().includes(query) ||
          c.CollectorName?.toLowerCase().includes(query)
      );
    }
    if (filters.paymentDate) {
      filteredData = filteredData.filter((c) =>
        dayjs(c.PaymentDate).isSame(filters.paymentDate, "day")
      );
    }

    setPagination((prev) => ({
      ...prev,
      total: filteredData.length,
    }));

    const paginatedData = filteredData.slice(
      (pagination.current - 1) * pagination.pageSize,
      pagination.current * pagination.pageSize
    );
    setCollections(paginatedData);
  }, [allCollections, pagination.current, pagination.pageSize, filters]);

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  const handleSaveParsedCollections = async () => {
    const selected = parsedCollections.filter((_, i) =>
      selectedRowKeys.includes(i)
    );
    if (selected.length === 0) {
      message.warning("Please select at least one record to save.");
      return;
    }

    try {
      await api.post(`/loan-collections/import/${loan.loanInfo.loanNo}`, {
        data: selected,
      });
      message.success("Collections saved to metadata!");
      setIsPreviewModalVisible(false);
    } catch (err) {
      console.error(err);
      message.error("Failed to save collections.");
    }
  };

  const handleImportCollections = async () => {
    try {
      const res = await api.post(
        `/loan-collections/commit/${loan.loanInfo.loanNo}`
      );
      if (res.data.success) {
        message.success("Collections imported successfully!");
        fetchCollections();
      } else {
        message.warning(res.data.message || "Nothing to import.");
      }
    } catch (err) {
      console.error(err);
      message.error("Import failed.");
    }
  };

  const handleDeleteCollection = async (record) => {
    try {
      await api.delete(`/loan-collections/${record._id}`);
      message.success("Collection deleted successfully.");
      fetchCollections(); // Refresh data
    } catch (error) {
      console.error("Error deleting collection:", error);
      message.error("Failed to delete collection.");
    }
  };

  const handleUpdateCollector = async () => {
    try {
      const values = await form.validateFields();
      await api.patch("/loan-collections/bulk-update", {
        ids: selectedMainTableRowKeys,
        updates: { CollectorName: values.collectorName },
      });
      message.success(
        "Collector updated successfully for selected collections."
      );
      setIsUpdateCollectorModalVisible(false);
      setSelectedMainTableRowKeys([]);
      fetchCollections();
    } catch (error) {
      console.error("Error updating collector:", error);
      message.error("Failed to update collector.");
    }
  };

  const handleExport = (type) => {
    exportData(allCollections, {
      type,
      title: "Loan Collections Report",
      metadata: {
        name: `${loan?.person?.firstName || ""} ${loan?.person?.lastName || ""}`,
        address: loan?.address,
        contact: loan?.person?.ContactNumber,
        loanNo: loan?.loanInfo?.loanNo,
        collector: allCollections[0]?.CollectorName || "",
      },
      columns: [
        {
          key: "PaymentDate",
          header: "Date",
          format: (v) => (v ? dayjs(v).format("MM/DD/YYYY") : ""),
        },
        { key: "CollectionReferenceNo", header: "Ref No" },
        {
          key: "CollectionPayment",
          header: "Payment",
          format: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
          total: true,
        },
        {
          key: "RunningBalance",
          header: "Balance",
          format: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
        },
        {
          key: "Penalty",
          header: "Penalty",
          format: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
        },
        { key: "CollectorName", header: "Collector" },
      ],
      includeTotals: true,
    });
  };

  const collectionSummary = useMemo(() => {
    const totalCollections = allCollections.filter(
      (c) => !c.isDisbursement
    ).length;
    const totalAmountCollected = allCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.CollectionPayment || 0),
      0
    );
    const totalPenalty = allCollections.reduce(
      (acc, curr) => acc + parseFloat(curr.Penalty || 0),
      0
    );
    const lastCollection = allCollections[allCollections.length - 1];
    const remainingBalance = lastCollection
      ? lastCollection.RunningBalance
      : loan?.loanInfo?.amount;

    return {
      totalCollections,
      totalAmountCollected,
      totalPenalty,
      remainingBalance,
    };
  }, [allCollections, loan]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const mainTableRowSelection = {
    selectedRowKeys: selectedMainTableRowKeys,
    onChange: (keys) => setSelectedMainTableRowKeys(keys),
  };

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
      render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
    },
    {
      title: "Balance",
      dataIndex: "RunningBalance",
      render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
    },
    {
      title: "Penalty",
      dataIndex: "Penalty",
      render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
    },
    { title: "Collector", dataIndex: "CollectorName" },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
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

  const collapseItems = [
    {
      key: "1",
      label: "Collection Summary",
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <p>
              <b>Loan Amount:</b> ₱
              {parseFloat(collectionSummary?.loanAmount || 0).toLocaleString()}
            </p>
            <p>
              <b>Start Date:</b>{" "}
              {collectionSummary?.startDate
                ? dayjs(collectionSummary.startDate).format("MM/DD/YYYY")
                : "N/A"}
            </p>
            <p>
              <b>Maturity Date:</b>{" "}
              {collectionSummary?.maturityDate
                ? dayjs(collectionSummary.maturityDate).format("MM/DD/YYYY")
                : "N/A"}
            </p>
          </Col>
          <Col span={8}>
            <p>
              <b>Total Collections:</b> {collectionSummary?.totalCollections || 0}
            </p>
            <p>
              <b>Principal Paid:</b> ₱
              {(collectionSummary?.totalPrincipalPaid || 0).toLocaleString()}
            </p>
            <p>
              <b>Interest Paid:</b> ₱
              {(collectionSummary?.totalInterestPaid || 0).toLocaleString()}
            </p>
          </Col>
          <Col span={8}>
            <p>
              <b>Total Amount Collected:</b> ₱
              {(collectionSummary?.totalAmountCollected || 0).toLocaleString()}
            </p>
            <p>
              <b>Total Penalty:</b> ₱
              {(collectionSummary?.totalPenalty || 0).toLocaleString()}
            </p>
            <p>
              <b>Remaining Balance:</b> ₱
              {parseFloat(
                collectionSummary?.remainingBalance || 0
              ).toLocaleString()}
            </p>
          </Col>
        </Row>
      ),
    },
  ];

  const exportMenu = {
    onClick: ({ key }) => handleExport(key),
    items: [
      {
        key: "excel",
        label: "Export as Excel",
        icon: <FileExcelOutlined />,
      },
      {
        key: "pdf",
        label: "Export as PDF",
        icon: <FilePdfOutlined />,
      },
    ],
  };

  return (
    <div className="collections-container">
      <h2>
        Collections for {loan?.person?.firstName} {loan?.person?.middleName}{" "}
        {loan?.person?.lastName} (Loan No: {loan?.loanInfo?.loanNo || "N/A"})
      </h2>

      <div className="collections-filters" style={{ marginBottom: 12 }}>
        <Input
          placeholder="Search..."
          style={{ width: 200 }}
          size="small"
          value={filters.q}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, q: e.target.value }))
          }
          suffix={
            <SearchOutlined
              onClick={() => fetchCollections()}
              style={{ color: "rgba(0,0,0,.45)" }}
            />
          }
        />
        <div style={{ flexGrow: 1 }} />
        {selectedMainTableRowKeys.length > 0 && (
          <Button
            style={{ marginRight: 8 }}
            onClick={() => setIsUpdateCollectorModalVisible(true)}
          >
            Update Collector ({selectedMainTableRowKeys.length})
          </Button>
        )}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalVisible(true)}
        >
          Add Collection
        </Button>
        <Button
          style={{ background: "green", color: "white", marginLeft: 8 }}
          icon={<UploadOutlined />}
          onClick={() => setIsUploadModalVisible(true)}
        >
          Upload File
        </Button>
        <Button
          style={{ background: "blue", color: "white", marginLeft: 8 }}
          icon={<ImportOutlined />}
          onClick={handleImportCollections}
        >
          {hasImportedCollections ? "Reimport Data" : "Import Collections"}
        </Button>
        <Dropdown menu={exportMenu}>
          <Button style={{ marginLeft: 8 }}>
            Export <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      <Collapse items={collapseItems} style={{ marginBottom: 12 }} />

      {/* Table */}
      <Table
        columns={columns}
        dataSource={collections}
        rowKey={(r) => r._id || r.CollectionReferenceNo}
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
      <Modal
        title="Upload Collection File"
        open={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        footer={null}
      >
        <Dragger
          multiple={false}
          showUploadList={false}
          beforeUpload={async (file) => {
            const formData = new FormData();
            formData.append("file", file);

            try {
              const res = await api.post("/parse/word", formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });

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
          <p className="ant-upload-text">
            Click or drag Word (.doc / .docx) file here
          </p>
        </Dragger>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Preview Parsed Collections"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        width={900}
        okText="Save Selected"
        onOk={handleSaveParsedCollections}
      >
        {/* Header Info Summary */}
        {headerInfo && Object.keys(headerInfo).length > 0 && (
          <div
            style={{
              marginBottom: 16,
              background: "#fafafa",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <h4>📄 File Info</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {headerInfo.Name && (
                <p>
                  <b>Name:</b> {headerInfo.Name}
                </p>
              )}
              {headerInfo.AccountNumber && (
                <p>
                  <b>Account No:</b> {headerInfo.AccountNumber}
                </p>
              )}
              {headerInfo.Address && (
                <p>
                  <b>Address:</b> {headerInfo.Address}
                </p>
              )}
              {headerInfo.Collector && (
                <p>
                  <b>Collector:</b> {headerInfo.Collector}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultActiveKey="1">
          {/* TAB 1 - Parsed Collections */}
          <TabPane tab="Parsed Collections" key="1">
            <Table
              size="small"
              dataSource={parsedCollections}
              rowKey={(_, i) => i}
              pagination={true}
              rowSelection={rowSelection}
              columns={[
                {
                  title: "Date",
                  dataIndex: "PaymentDate",
                  render: (d) => dayjs(d).format("MM/DD/YYYY"),
                },
                { title: "Ref No", dataIndex: "CollectionReferenceNo" },
                {
                  title: "Payment",
                  dataIndex: "CollectionPayment",
                  render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
                },
                {
                  title: "Balance",
                  dataIndex: "RunningBalance",
                  render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
                },
                {
                  title: "Penalty",
                  dataIndex: "Penalty",
                  render: (v) => `₱${parseFloat(v || 0).toLocaleString()}`,
                },
              ]}
              scroll={{ y: 400 }}
            />
          </TabPane>

          {/* TAB 2 - Raw Extracted Lines */}
          <TabPane tab="Raw Extracted Lines" key="2">
            <List
              bordered
              size="small"
              dataSource={rawLines}
              style={{ maxHeight: 400, overflowY: "auto" }}
              renderItem={(line) => <List.Item>{line}</List.Item>}
            />
          </TabPane>

          {/* TAB 3 - Raw JSON */}
          <TabPane tab="Raw JSON" key="3">
            <pre
              style={{
                maxHeight: 400,
                overflow: "auto",
                background: "#f5f5f5",
                padding: "8px",
              }}
            >
              {JSON.stringify(parsedCollections, null, 2)}
            </pre>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Add Collection Modal */}
      <AddCollectionModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          fetchCollections();
        }}
        loan={loan}
      />

      {/* Edit Modal */}
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
            fetchCollections();
          }}
          collectionData={editingCollection}
          loan={loan}
        />
      )}

      {/* Update Collector Modal */}
      <Modal
        title="Update Collector"
        open={isUpdateCollectorModalVisible}
        onCancel={() => setIsUpdateCollectorModalVisible(false)}
        onOk={handleUpdateCollector}
        okText="Update"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="collectorName"
            label="Collector"
            rules={[{ required: true, message: "Please select a collector" }]}
          >
            <Select placeholder="Select a new collector">
              {collectors.map((collector) => (
                <Option key={collector._id} value={collector.Name}>
                  {collector.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default Collections;