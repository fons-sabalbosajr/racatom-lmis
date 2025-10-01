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
  Dropdown,
  Menu,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  DownOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import api from "../../utils/axios";
import dayjs from "dayjs";
import "./collections.css";
import AddCollectionModal from "./components/AddCollectionModal";
import EditCollectionModal from "./components/EditCollectionModal";
import ExportCollectionsInExcel from "../../utils/ExportCollectionsInExcel";
import ExportCollectionPDF from "../../utils/ExportCollectionPDF";

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

      const initialDisbursement = {
        _id: "initial-disbursement",
        PaymentDate: loan.loanInfo.startPaymentDate || loan.createdAt,
        CollectorName: "N/A",
        CollectionReferenceNo: loan.loanInfo.loanNo,
        Amortization: 0,
        CollectionPayment: 0,
        RunningBalance: currentBalance,
        isDisbursement: true,
      };

      const processedCollections = sortedCollections.map((collection) => {
        const payment = parseFloat(collection.CollectionPayment || 0);
        currentBalance -= payment;

        return {
          ...collection,
          RunningBalance: currentBalance,
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

  const fetchCollections = useCallback(() => {
    if (!loan?.loanInfo?.loanNo) {
        setCollections([]);
        return;
    }
    
    setLoading(true);
    const queryParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        q: filters.q,
        paymentDate: filters.paymentDate?.toISOString(),
    };

    api.get(`/loan-collections/${loan.loanInfo.loanNo}`, { params: queryParams })
        .then(response => {
            if (response.data.success) {
                const collectionsWithRunningBalance = calculateRunningBalance(response.data.data);
                setCollections(collectionsWithRunningBalance);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.meta?.total || response.data.data.length,
                }));
            } else {
                message.error("Failed to fetch collections.");
            }
        })
        .catch(error => {
            console.error("Error fetching collections:", error);
            message.error("Error fetching collections.");
        })
        .finally(() => {
            setLoading(false);
        });
  }, [loan?.loanInfo?.loanNo, pagination.current, pagination.pageSize, filters.q, filters.paymentDate, calculateRunningBalance]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({ ...prev, current: newPagination.current, pageSize: newPagination.pageSize }));
  };

  const applyFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page on filter change
  };

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
    if (!loan || collections.length === 0) {
      message.warning("No data to export.");
      return;
    }
    ExportCollectionsInExcel(loan, collections);
  };

  const handleExportCollectionsToPdf = () => {
    if (!loan || collections.length === 0) {
      message.warning("No data to export.");
      return;
    }
    ExportCollectionPDF(loan, collections);
  };

  const exportMenu = (
    <Menu>
      <Menu.Item key="excel" icon={<FileExcelOutlined />} onClick={handleExportCollectionsToExcel}>
        Export as Excel
      </Menu.Item>
      <Menu.Item key="pdf" icon={<FilePdfOutlined />} onClick={handleExportCollectionsToPdf}>
        Export as PDF
      </Menu.Item>
    </Menu>
  );

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
      title: "Date",
      dataIndex: "PaymentDate",
      key: "PaymentDate",
      render: (text) => (text ? dayjs(text).format("MM/DD/YYYY") : "N/A"),
    },
    {
        title: "Collection Ref No",
        dataIndex: "CollectionReferenceNo",
        key: "CollectionReferenceNo",
    },
    {
      title: "Amortization",
      dataIndex: "Amortization",
      key: "Amortization",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
        title: "Payment",
        dataIndex: "CollectionPayment",
        key: "CollectionPayment",
        render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
      title: "Loan Balance",
      dataIndex: "RunningBalance",
      key: "RunningBalance",
      render: (text) => `₱${parseFloat(text || 0).toLocaleString()}`,
    },
    {
        title: "Penalty Payment",
        key: "penaltyPayment",
        render: () => "₱0",
    },
    {
      title: "Collector",
      dataIndex: "CollectorName",
      key: "CollectorName",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
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
    let totalAmortization = 0;
    let totalPayment = 0;

    pageData.forEach(({ Amortization, CollectionPayment, isDisbursement }) => {
      if (!isDisbursement) {
        totalAmortization += parseFloat(Amortization || 0);
        totalPayment += parseFloat(CollectionPayment || 0);
      }
    });

    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={2}>Total</Table.Summary.Cell>
        <Table.Summary.Cell index={2}>
          <Text strong>₱{totalAmortization.toLocaleString()}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3}>
          <Text strong>₱{totalPayment.toLocaleString()}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} />
        <Table.Summary.Cell index={5} />
        <Table.Summary.Cell index={6} />
        <Table.Summary.Cell index={7} />
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
        <Dropdown overlay={exportMenu}>
          <Button>
            Export <DownOutlined />
          </Button>
        </Dropdown>
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
          loan={loan}
        />
      )}
    </div>
  );
};

export default Collections;
