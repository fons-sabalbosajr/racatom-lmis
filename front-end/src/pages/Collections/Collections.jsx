import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Space,
  Button,
  Input,
  Typography,
  message,
  Popconfirm,
  DatePicker,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import api from "../../utils/axios";
import dayjs from "dayjs";
import "./collections.css";
import AddCollectionModal from "./components/AddCollectionModal";
import EditCollectionModal from "./components/EditCollectionModal";

const { Text } = Typography;

const Collections = ({ loan }) => {
  const [collections, setCollections] = useState([]);
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

  const calculateRunningBalance = useCallback(
    (fetchedCollections) => {
      if (!loan?.loanInfo?.amount) return [];

      const sortedCollections = [...fetchedCollections].sort((a, b) =>
        dayjs(a.PaymentDate).diff(dayjs(b.PaymentDate))
      );

      let currentBalance = parseFloat(loan.loanInfo.amount);
      let currentRunningPayment = 0;

      const initialDisbursement = {
        _id: "initial-disbursement",
        PaymentDate: loan.loanInfo.startPaymentDate || loan.createdAt,
        CollectorName: "N/A",
        PaymentMode: "Disbursement",
        CollectionReferenceNo: loan.loanInfo.loanNo,
        Amortization: 0,
        PrincipalPaid: 0,
        InterestPaid: 0,
        TotalCollected: 0,
        RunningBalance: currentBalance,
        RunningPayment: 0,
        Remarks: "Initial Loan Disbursement",
        isDisbursement: true,
      };

      const processedCollections = sortedCollections.map((collection) => {
        const totalCollected = parseFloat(collection.TotalCollected || 0);
        currentBalance -= totalCollected;
        currentRunningPayment += totalCollected;

        return {
          ...collection,
          RunningBalance: currentBalance,
          RunningPayment: currentRunningPayment,
        };
      });

      return [initialDisbursement, ...processedCollections];
    },
    [
      loan?.loanInfo?.amount,
      loan?.loanInfo?.startPaymentDate,
      loan?.createdAt,
      loan?.loanInfo?.loanNo,
    ]
  );

  const getRowClassName = useCallback(
    (record) => {
      if (record.isDisbursement) return "disbursement-row";

      const paymentDate = dayjs(record.PaymentDate);
      const startPaymentDate = dayjs(loan?.loanInfo?.startPaymentDate);
      const maturityDate = dayjs(loan?.loanInfo?.maturityDate);

      if (
        !paymentDate.isValid() ||
        !startPaymentDate.isValid() ||
        !maturityDate.isValid()
      ) {
        return "";
      }

      // Example logic for late/advanced payment
      if (paymentDate.isAfter(maturityDate)) {
        return "late-payment-row";
      }
      if (paymentDate.isBefore(startPaymentDate.subtract(7, "day"))) {
        return "advanced-payment-row";
      }

      return "";
    },
    [loan?.loanInfo?.startPaymentDate, loan?.loanInfo?.maturityDate]
  );

  const fetchCollections = useCallback(
    async (params = {}) => {
      if (!loan?.loanInfo?.loanNo) {
        setCollections([]);
        return;
      }

      setLoading(true);
      try {
        const queryParams = {
          page: params.pagination?.current || pagination.current,
          limit: params.pagination?.pageSize || pagination.pageSize,
          q: params.filters?.q || filters.q,
          paymentDate:
            params.filters?.paymentDate?.toISOString() ||
            filters.paymentDate?.toISOString(),
        };
        const response = await api.get(
          `/loan-collections/${loan.loanInfo.loanNo}`,
          {
            params: queryParams,
          }
        );

        if (response.data.success) {
          const collectionsWithRunningBalance = calculateRunningBalance(
            response.data.data
          );
          setCollections(collectionsWithRunningBalance);
          setPagination({
            ...pagination,
            total: response.data.meta?.total || response.data.data.length,
            current: response.data.meta?.page || pagination.current,
            pageSize: response.data.meta?.limit || pagination.pageSize,
          });
        } else {
          message.error("Failed to fetch collections.");
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        message.error("Error fetching collections.");
      } finally {
        setLoading(false);
      }
    },
    [
      loan?.loanInfo?.loanNo,
      pagination.current,
      pagination.pageSize,
      filters.q,
      filters.paymentDate,
      calculateRunningBalance,
    ]
  );

  useEffect(() => {
    if (loan?.loanInfo?.loanNo) {
      fetchCollections();
    }
  }, [loan?.loanInfo?.loanNo, fetchCollections]);

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
    fetchCollections({
      pagination: newPagination,
      filters: filters,
    });
  };

  const applyFilters = useCallback(
    (newFilters) => {
      setFilters((prevFilters) => {
        const updatedFilters = { ...prevFilters, ...newFilters };
        fetchCollections({
          filters: updatedFilters,
          pagination: { current: 1, pageSize: pagination.pageSize },
        });
        return updatedFilters;
      });
    },
    [fetchCollections, pagination.pageSize]
  );

  const handleSearch = (qValue) => {
    applyFilters({ q: qValue });
  };

  const handlePaymentDateChange = (date) => {
    applyFilters({ paymentDate: date });
  };

  const handleAddCollection = () => {
    setIsAddModalVisible(true);
  };

  const handleExportCollectionsToExcel = () => {
    if (!loan?.accountId || !loan?.loanInfo?.loanNo) {
      message.warning("Loan details are missing for export.");
      return;
    }
    const params = new URLSearchParams({
      reportType: "loanCollections",
      loanCycleNo: loan.loanInfo.loanNo,
      accountId: loan.accountId,
      ...(filters.paymentDate && {
        paymentDate: filters.paymentDate.toISOString(),
      }),
    });
    window.open(
      `${import.meta.env.VITE_API_URL.replace(
        /\/$/,
        ""
      )}/loans/export?${params.toString()}`,
      "_blank"
    );
  };

  const handleEditCollection = (record) => {
    setEditingCollection(record);
    setIsEditModalVisible(true);
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

  const handleGenerateSOA = () => {
    if (!loan?.accountId || !loan?.loanInfo?.loanNo) {
      message.warning("Loan details are missing for SOA generation.");
      return;
    }
    const params = new URLSearchParams({
      reportType: "statement-of-account",
      accountId: loan.accountId,
      loanCycleNo: loan.loanInfo.loanNo,
      ...(filters.paymentDate && {
        paymentDate: filters.paymentDate.toISOString(),
      }),
    });
    window.open(
      `${import.meta.env.VITE_API_URL.replace(
        /\/$/,
        ""
      )}/loans/export?${params.toString()}`,
      "_blank"
    );
  };

  const columns = [
    {
      title: "Payment Date",
      dataIndex: "PaymentDate",
      key: "PaymentDate",
      render: (text) => (text ? dayjs(text).format("MM/DD/YYYY") : "N/A"),
    },
    {
      title: "Collector",
      dataIndex: "CollectorName",
      key: "CollectorName",
    },
    {
      title: "Payment Details", // Merged column title
      key: "paymentDetails",
      render: (_, record) => (
        <>
          <div>{record.PaymentMode}</div>
          {record.CollectionReferenceNo && (
            <div style={{ fontSize: "10px", color: "gray" }}>
              Ref: {record.CollectionReferenceNo}
            </div>
          )}
        </>
      ),
    },
    {
      title: "Amortization",
      dataIndex: "Amortization",
      key: "Amortization",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Principal Paid",
      dataIndex: "PrincipalPaid",
      key: "PrincipalPaid",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Interest Paid",
      dataIndex: "InterestPaid",
      key: "InterestPaid",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Total Collected",
      dataIndex: "TotalCollected",
      key: "TotalCollected",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Running Payment", // New column
      dataIndex: "RunningPayment",
      key: "RunningPayment",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Running Balance",
      dataIndex: "RunningBalance",
      key: "RunningBalance",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Remarks", // New Remarks column
      dataIndex: "Remarks",
      key: "Remarks",
      width: 100,
      render: (text) => (
        <span style={{ fontSize: "11px", whiteSpace: "normal" }}>
          {text || "N/A"}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        // Only show actions for actual collection records, not the disbursement row
        !record.isDisbursement && (
          <Space size="small">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditCollection(record)}
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

  const summary = (pageData) => {
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalTotalCollected = 0;

    pageData.forEach(
      ({ PrincipalPaid, InterestPaid, TotalCollected, isDisbursement }) => {
        if (!isDisbursement) {
          // Exclude disbursement row from summary totals
          totalPrincipalPaid += parseFloat(PrincipalPaid || 0);
          totalInterestPaid += parseFloat(InterestPaid || 0);
          totalTotalCollected += parseFloat(TotalCollected || 0);
        }
      }
    );

    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={5}>
          Total
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1}>
          <Text strong>₱{totalPrincipalPaid.toLocaleString()}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2}>
          <Text strong>₱{totalInterestPaid.toLocaleString()}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3}>
          <Text strong>₱{totalTotalCollected.toLocaleString()}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4}></Table.Summary.Cell>
        <Table.Summary.Cell index={5}></Table.Summary.Cell>
        <Table.Summary.Cell index={6}></Table.Summary.Cell>
      </Table.Summary.Row>
    );
  };

  return (
    <div className="collections-container">
      <h2>
        Collections for {loan?.person?.firstName} {loan?.person?.middleName}{" "}
        {loan?.person?.lastName} (Loan No: {loan?.loanInfo?.loanNo || "N/A"})
      </h2>
      <div className="collections-filters">
        <Input
          placeholder="Search by keyword"
          style={{ width: 200, height: 32 }}
          size="small"
          value={filters.q}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, q: e.target.value }))
          }
          onPressEnter={() => handleSearch(filters.q)}
          suffix={
            <SearchOutlined
              onClick={() => handleSearch(filters.q)}
              style={{ color: "rgba(0,0,0,.45)" }}
            />
          }
        />
        <DatePicker
          onChange={handlePaymentDateChange}
          value={filters.paymentDate}
          style={{ width: 150 }}
          allowClear
        />
        <div style={{ flexGrow: 1 }} /> {/* Spacer */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddCollection}
        >
          Add Collection
        </Button>
        <Button
          icon={<FileExcelOutlined />}
          onClick={handleExportCollectionsToExcel}
        >
          Export to Excel
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleGenerateSOA}>
          Generate SOA
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={collections}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey={(record) => record._id}
        scroll={{ x: "max-content" }}
        size="small"
        summary={summary}
        rowClassName={getRowClassName}
      />
      <AddCollectionModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          fetchCollections();
        }}
        loan={loan}
      />
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
        />
      )}
    </div>
  );
};

export default Collections;
