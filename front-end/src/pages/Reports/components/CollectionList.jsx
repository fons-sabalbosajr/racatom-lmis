import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Typography,
  message,
  Pagination,
  Select,
  Input,
  DatePicker,
  Button,
  Space,
  Tooltip,
  Checkbox,
} from "antd";
import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import dayjs from "dayjs";
import EditCollectionModal from "./EditCollectionModal";

const { Title } = Typography;
const { Search } = Input;

export default function CollectionList() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [paymentDate, setPaymentDate] = useState(null);
  const [tableParams, setTableParams] = useState({
    current: 1,
    pageSize: 10,
    sorter: {},
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const { field, order } = tableParams.sorter || {};
      const res = await api.get("/loan-collections", {
        params: {
          page: tableParams.current,
          limit: tableParams.pageSize,
          q,
          paymentDate: paymentDate
            ? paymentDate.format("YYYY-MM-DD")
            : undefined,
          sortBy: field || "PaymentDate",
          sortDir: order === "descend" ? "desc" : "asc",
        },
      });
      if (res.data.success) {
        let collections = res.data.data;
        if (!includeDuplicates) {
          const uniqueRefs = new Set();
          collections = collections.filter((item) => {
            if (uniqueRefs.has(item.CollectionReferenceNo)) {
              return false;
            }
            uniqueRefs.add(item.CollectionReferenceNo);
            return true;
          });
        }
        setData(collections);
        setMeta(res.data.meta);
      } else {
        message.error("Failed to load collections");
      }
    } catch (err) {
      console.error(err);
      message.error("Error loading collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [tableParams, q, paymentDate, includeDuplicates]);

  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      current: pagination.current,
      pageSize: pagination.pageSize,
      sorter,
    });
  };

  const onSearch = (value) => {
    setQ(value);
    setTableParams((prev) => ({ ...prev, current: 1 }));
  };

  const onDateChange = (date) => {
    setPaymentDate(date);
    setTableParams((prev) => ({ ...prev, current: 1 }));
  };

  const handleEdit = (record) => {
    setSelectedCollection(record);
    setIsModalVisible(true);
  };

  const handleGenerateVoucher = (record) => {
    // Placeholder for voucher generation
    message.info("Voucher generation coming soon!");
  };

  const columns = [
    {
      title: "Client Name",
      dataIndex: ["client", "ClientName"],
      key: "clientName",
      sorter: true,
      render: (_, record) => {
        const client = record.client || {};
        const fromNested = client.ClientName;
        const fromFlat = record.clientName || record.ClientName; // backend may add clientName
        const constructed = [
          record.clientInfo?.FirstName,
          record.clientInfo?.MiddleName,
          record.clientInfo?.LastName,
        ]
          .filter(Boolean)
          .join(" ");
        const name = (fromNested || fromFlat || constructed || "").trim();
        return name || "N/A";
      },
    },
    {
      title: "Payment Date",
      dataIndex: "PaymentDate",
      key: "PaymentDate",
      sorter: true,
      render: (value) => {
        if (!value) return "—";
        // Date instance
        if (value instanceof Date) {
          const d = dayjs(value);
          return d.isValid() ? d.format("MM/DD/YYYY") : "—";
        }
        // Mongo Extended JSON variants
        if (typeof value === "object") {
          // { $date: "iso" } or { $date: { $numberLong: "..." } } or Date
          if ("$date" in value) {
            const dv = value.$date;
            if (dv instanceof Date) {
              const d = dayjs(dv);
              return d.isValid() ? d.format("MM/DD/YYYY") : "—";
            }
            if (typeof dv === "string") {
              const d = dayjs(dv);
              return d.isValid() ? d.format("MM/DD/YYYY") : "—";
            }
            if (dv && typeof dv === "object" && "$numberLong" in dv) {
              const num = Number(dv.$numberLong);
              const d = dayjs(num);
              return d.isValid() ? d.format("MM/DD/YYYY") : "—";
            }
          }
          // Direct numeric long in object { $numberLong: "..." }
          if ("$numberLong" in value) {
            const num = Number(value.$numberLong);
            const d = dayjs(num);
            return d.isValid() ? d.format("MM/DD/YYYY") : "—";
          }
        }
        // ISO string or numeric timestamp
        if (typeof value === "string") {
          const d = dayjs(value);
          if (d.isValid()) return d.format("MM/DD/YYYY");
        }
        const n = Number(value);
        if (!Number.isNaN(n)) {
          const d2 = dayjs(n);
          if (d2.isValid()) return d2.format("MM/DD/YYYY");
        }
        return "—";
      },
    },
    {
      title: "Collector Name",
      dataIndex: "CollectorName",
      key: "CollectorName",
      sorter: true,
    },
    {
      title: "Payment Mode",
      dataIndex: "PaymentMode",
      key: "PaymentMode",
      sorter: true,
      render: (text) => text || "Cash",
    },
    {
      title: "Amount",
      dataIndex: "CollectionPayment",
      key: "CollectionPayment",
      sorter: true,
      align: "right",
      render: (text) => `₱${parseFloat(text).toFixed(2)}`,
    },
    {
      title: "Reference No",
      dataIndex: "CollectionReferenceNo",
      key: "CollectionReferenceNo",
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Generate Receipt Voucher">
            <Button
              type="link"
              icon={<FileTextOutlined />}
              onClick={() => handleGenerateVoucher(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card>
        <Title level={4} style={{ marginTop: -8, marginBottom: 8 }}>Collection List</Title>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Search
            placeholder="Search by name, collector, etc."
            onSearch={onSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Space>
            <DatePicker onChange={onDateChange} />
            <Checkbox onChange={(e) => setIncludeDuplicates(e.target.checked)}>
              Include Duplicates
            </Checkbox>
          </Space>
        </div>
        <Table
          rowKey={(r) => {
            // Normalize _id to a string; fall back to a deterministic composite key
            const id = r && r._id;
            if (typeof id === "string") return id;
            if (id && typeof id === "object") {
              if (typeof id.$oid === "string") return id.$oid;
              if (typeof id.toString === "function") {
                const s = id.toString();
                if (s && s !== "[object Object]") return s;
              }
            }
            const ts = r && r.PaymentDate ? dayjs(r.PaymentDate).valueOf() : "";
            return [r?.AccountId, r?.LoanCycleNo, ts, r?.CollectionReferenceNo, r?.CollectionPayment]
              .filter((v) => v !== undefined && v !== null)
              .join("|");
          }}
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={false}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <Typography.Text>Total Collections: {meta.total}</Typography.Text>
          <Pagination
            current={meta.page}
            pageSize={meta.limit}
            total={meta.total}
            onChange={(page, pageSize) =>
              handleTableChange({ current: page, pageSize }, {}, {})
            }
            showSizeChanger
            onShowSizeChange={(current, size) =>
              setTableParams((prev) => ({
                ...prev,
                current: 1,
                pageSize: size,
              }))
            }
          />
        </div>
      </Card>
      {selectedCollection && (
        <EditCollectionModal
          visible={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            setSelectedCollection(null);
          }}
          collection={selectedCollection}
          onSuccess={() => {
            setIsModalVisible(false);
            setSelectedCollection(null);
            fetchCollections();
          }}
        />
      )}
    </>
  );
}