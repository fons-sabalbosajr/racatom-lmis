import React, { useEffect, useState } from "react";
import {
  Table,
  Typography,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Upload,
  Popover,
  Image,
  Dropdown,
  Progress,
  Select,
} from "antd";
import {
  PlusOutlined,
  LinkOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import api from "../../../utils/axios";

const { Text } = Typography;

/**
 * LoanDocumentsTab
 * Props:
 *  - loan (object): expects loan.loanInfo.clientNo or loan.clientNo
 *  - accountId (string) optional
 */
export default function LoanDocumentsTab({
  loan,
  accountId: accountIdProp,
  cycles,
}) {
  // Derive AccountId from explicit prop first, else from loan
  const derivedAccountId =
    accountIdProp ||
    loan?.loanInfo?.accountId ||
    loan?.accountId ||
    loan?.AccountId ||
    loan?.AccountID ||
    loan?.AccountIdNo;
  const accountId = derivedAccountId || "";
  // Determine latest loan cycle (highest createdAt or updatedAt)
  const loanCycles = cycles || loan?.loanCycles || loan?.cycles || [];
  const latestCycle =
    Array.isArray(loanCycles) && loanCycles.length
      ? [...loanCycles].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        )[0]
      : loan?.loanInfo
      ? { LoanCycleNo: loan.loanInfo.loanNo }
      : null;
  const loanCycleNo =
    latestCycle?.LoanCycleNo ||
    latestCycle?.loanCycleNo ||
    latestCycle?.loanNo ||
    latestCycle?.LoanNo ||
    "";
  // Helpers for formatting
  const formatMoney = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const num = Number(String(v).replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return v;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  };
  const clientName =
    loan?.fullName ||
    [loan?.person?.firstName, loan?.person?.middleName, loan?.person?.lastName]
      .filter(Boolean)
      .join(" ");
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm] = Form.useForm();
  const [preview, setPreview] = useState(null);

  const fetchDocs = async () => {
    if (!accountId || !loanCycleNo) return;
    try {
      setLoading(true);
      const res = await api.get(
        `/loans/account/${accountId}/cycle/${loanCycleNo}/documents`
      );
      if (res.data.success) {
        setDocs(res.data.data || []);
      } else {
        message.warning(res.data.message || "Could not load documents");
      }
    } catch (err) {
      console.error(err);
      message.error("Error fetching documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [accountId, loanCycleNo]);

  const handleAdd = () => {
    form.resetFields();
    setShowAdd(true);
  };

  const submitAdd = async () => {
    try {
      const values = await form.validateFields();
      if (!accountId || !loanCycleNo)
        return message.warning("Missing account or cycle");
      const payload = {
        name: values.name,
        link: values.link,
        type: values.type,
        source: values.source,
        loanCycleNo: loanCycleNo,
      };
      const res = await api.post(
        `/loans/account/${accountId}/documents/link`,
        payload
      );
      if (res.data.success) {
        message.success("Link saved");
        setShowAdd(false);
        fetchDocs();
      } else {
        message.error(res.data.message || "Failed to save");
      }
    } catch (err) {
      // ignore validation errors
    }
  };

  const inferSource = (url) => {
    if (!url) return "unknown";
    if (url.includes("drive.google.com")) return "Google Drive";
    return "External";
  };

  const inferType = (url) => {
    if (!url) return "other";
    const lower = url.toLowerCase();
    if (lower.match(/\.pdf($|\?)/)) return "pdf";
    if (lower.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/)) return "image";
    if (lower.match(/\.(doc|docx)($|\?)/)) return "doc";
    if (lower.match(/\.(xls|xlsx)($|\?)/)) return "sheet";
    return "other";
  };

  const resolveUrl = (raw) => {
    if (!raw) return "";
    if (/^https?:/i.test(raw)) return raw; // already absolute
    if (raw.startsWith("/uploads/")) {
      const base = import.meta.env.VITE_API_URL.replace(/\/$/, "");
      return base + raw; // backend static file
    }
    return raw;
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: `Delete ${record.name}?`,
      okType: "danger",
      onOk: async () => {
        try {
          const res = await api.delete(`/loans/documents/${record._id}`);
          if (res.data.success) {
            message.success("Deleted");
            fetchDocs();
          } else {
            message.error(res.data.message || "Delete failed");
          }
        } catch (e) {
          message.error("Delete error");
        }
      },
    });
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || "Untitled"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record._id}
          </Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (t) => {
        const colorMap = {
          pdf: "red",
          image: "gold",
          doc: "blue",
          sheet: "green",
          other: "default",
        };
        return (
          <Tag color={colorMap[t] || "default"}>
            {t?.toUpperCase() || "N/A"}
          </Tag>
        );
      },
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 130,
      render: (s) => (
        <Tag color={s === "Google Drive" ? "green" : "default"}>{s || "—"}</Tag>
      ),
    },
    {
      title: "Uploaded",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => {
        const menuItems = [
          {
            key: "open",
            label: "Open",
            onClick: () => {
              const url = resolveUrl(record.link || record.url);
              if (url) window.open(url, "_blank", "noopener");
              else message.info("No URL available");
            },
          },
          {
            key: "copy",
            label: "Copy Link",
            onClick: () => {
              const url = resolveUrl(record.link || record.url);
              if (url) {
                navigator.clipboard.writeText(url);
                message.success("Link copied");
              }
            },
          },
          record.type === "image" && (record.link || record.url)
            ? {
                key: "preview",
                label: "Preview",
                onClick: () =>
                  setPreview(resolveUrl(record.link || record.url)),
              }
            : null,
          {
            key: "delete",
            label: "Delete",
            danger: true,
            onClick: () => handleDelete(record),
          },
        ].filter(Boolean);
        return (
          <Space>
            {record.link || record.url ? (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  const url = resolveUrl(record.link || record.url);
                  if (record.type === "image") setPreview(url);
                  else if (url) window.open(url, "_blank", "noopener");
                }}
              >
                View
              </Button>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No Link
              </Text>
            )}
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {accountId && loanCycleNo && (
        <div
          style={{
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px" }}>
            <div>
              <strong>Account:</strong> {accountId}
            </div>
            <div>
              <strong>Cycle No:</strong> {loanCycleNo}
            </div>
            {latestCycle?.LoanType && (
              <div>
                <strong>Type:</strong> {latestCycle.LoanType}
              </div>
            )}
            {(latestCycle?.LoanStatus || loan?.loanInfo?.status) && (
              <div>
                <strong>Status:</strong>{" "}
                {latestCycle?.LoanStatus || loan?.loanInfo?.status}
              </div>
            )}
            {(latestCycle?.PaymentMode || loan?.loanInfo?.paymentMode) && (
              <div>
                <strong>Payment Mode:</strong>{" "}
                {latestCycle?.PaymentMode || loan?.loanInfo?.paymentMode}
              </div>
            )}
            {(latestCycle?.LoanAmount ?? loan?.loanInfo?.amount) !==
              undefined && (
              <div>
                <strong>Amount:</strong> ₱{" "}
                {formatMoney(latestCycle?.LoanAmount ?? loan?.loanInfo?.amount)}
              </div>
            )}
            {(latestCycle?.PrincipalAmount ?? loan?.loanInfo?.principal) !==
              undefined && (
              <div>
                <strong>Principal:</strong> ₱{" "}
                {formatMoney(
                  latestCycle?.PrincipalAmount ?? loan?.loanInfo?.principal
                )}
              </div>
            )}
            {(latestCycle?.LoanBalance ?? loan?.loanInfo?.balance) !==
              undefined && (
              <div>
                <strong>Balance:</strong> ₱{" "}
                {formatMoney(
                  latestCycle?.LoanBalance ?? loan?.loanInfo?.balance
                )}
              </div>
            )}
            {(latestCycle?.LoanInterest ?? loan?.loanInfo?.interest) !==
              undefined && (
              <div>
                <strong>Interest:</strong> ₱{" "}
                {formatMoney(
                  latestCycle?.LoanInterest ?? loan?.loanInfo?.interest
                )}
              </div>
            )}
            {(latestCycle?.Penalty ?? loan?.loanInfo?.penalty) !==
              undefined && (
              <div>
                <strong>Penalty:</strong> ₱{" "}
                {formatMoney(latestCycle?.Penalty ?? loan?.loanInfo?.penalty)}
              </div>
            )}
            {(latestCycle?.StartPaymentDate ||
              loan?.loanInfo?.startPaymentDate) && (
              <div>
                <strong>Start Date:</strong>{" "}
                {formatDate(
                  latestCycle?.StartPaymentDate ||
                    loan?.loanInfo?.startPaymentDate
                )}
              </div>
            )}
            {(latestCycle?.MaturityDate || loan?.loanInfo?.maturityDate) && (
              <div>
                <strong>Maturity:</strong>{" "}
                {formatDate(
                  latestCycle?.MaturityDate || loan?.loanInfo?.maturityDate
                )}
              </div>
            )}
            {latestCycle?.CollectorName && (
              <div>
                <strong>Collector:</strong> {latestCycle.CollectorName}
              </div>
            )}
          </div>
          {latestCycle?.Remarks && (
            <div style={{ marginTop: 6, color: "#555" }}>
              <strong>Remarks:</strong> {latestCycle.Remarks}
            </div>
          )}
        </div>
      )}
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            if (!accountId) {
              message.warning(
                "No AccountId detected yet – select a loan first."
              );
              return;
            }
            handleAdd();
          }}
        >
          Add Document Link
        </Button>
        <Button
          icon={<UploadOutlined />}
          loading={uploading}
          onClick={() => {
            if (!accountId || !loanCycleNo) {
              message.warning(
                "No loan cycle selected yet – open a loan / review Loan Info tab."
              );
              return;
            }
            uploadForm.resetFields();
            setShowUpload(true);
          }}
        >
          Upload File
        </Button>
        {accountId && (
          <Text type="secondary">
            Account: {accountId}
            {loanCycleNo ? ` | Cycle: ${loanCycleNo}` : ""}
          </Text>
        )}
      </Space>
      <Table
        size="small"
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={docs}
        loading={loading}
        pagination={{ pageSize: 5 }}
        locale={{
          emptyText: accountId ? "No documents yet" : "No account selected",
        }}
      />
      <Modal
        title={`Add Document Link${accountId ? ` – ${accountId}` : ""}${
          loanCycleNo ? ` (Cycle ${loanCycleNo})` : ""
        }${clientName ? ` | ${clientName}` : ""}`}
        open={showAdd}
        onOk={submitAdd}
        onCancel={() => setShowAdd(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Space
            size={16}
            direction="vertical"
            style={{ width: "100%", marginBottom: 8 }}
          >
            {accountId && (
              <Text type="secondary" style={{ display: "block" }}>
                Account: <strong>{accountId}</strong>
              </Text>
            )}
            {loanCycleNo && (
              <Text type="secondary" style={{ display: "block" }}>
                Loan Cycle: <strong>{loanCycleNo}</strong>
              </Text>
            )}
            {clientName && (
              <Text type="secondary" style={{ display: "block" }}>
                Client: <strong>{clientName}</strong>
              </Text>
            )}
          </Space>
          <Form.Item
            label="Display Name"
            name="name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="e.g., Valid ID (Front)" />
          </Form.Item>
          <Form.Item
            label="Link (Google Drive or external)"
            name="link"
            rules={[{ required: true, message: "Please paste a link" }]}
          >
            <Input placeholder="https://drive.google.com/file/..." />
          </Form.Item>
          <Form.Item label="Type (optional)" name="type">
            <Input placeholder="pdf, image, doc, sheet, other" />
          </Form.Item>
          <Form.Item label="Source (auto if blank)" name="source">
            <Input placeholder="Google Drive" />
          </Form.Item>
          <Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Files should be uploaded to the shared Drive folders first. Then
              paste the share link here. <br />
              Docs Folder:{" "}
              <a
                href="https://drive.google.com/drive/folders/1kMd3QjEw95oJsMSAK9xwEf-I3_MKlMBj"
                target="_blank"
                rel="noopener"
              >
                Open
              </a>{" "}
              | Images Folder:{" "}
              <a
                href="https://drive.google.com/drive/folders/1O_-PLQyRAjUV7iy6d3PN5rLXznOzxean"
                target="_blank"
                rel="noopener"
              >
                Open
              </a>
            </Text>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={!!preview}
        footer={null}
        onCancel={() => setPreview(null)}
        width={800}
      >
        {preview && (
          <Image
            src={preview}
            alt="Preview"
            style={{ maxHeight: 600, objectFit: "contain" }}
            preview={false}
          />
        )}
      </Modal>
      <Modal
        title={`Upload Document${accountId ? ` – ${accountId}` : ""}${
          loanCycleNo ? ` (Cycle ${loanCycleNo})` : ""
        }`}
        open={showUpload}
        onCancel={() => {
          if (!uploading) {
            setShowUpload(false);
            setUploadProgress(0);
          }
        }}
        onOk={() => uploadForm.submit()}
        okButtonProps={{ loading: uploading, disabled: uploading }}
        destroyOnClose
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={async (vals) => {
            const fileItem = Array.isArray(vals.file)
              ? vals.file[vals.file.length - 1]
              : vals.file;
            const originFile =
              fileItem?.originFileObj ||
              fileItem?.file ||
              fileItem?.file?.originFileObj;
            if (!originFile) {
              return message.warning("Please choose a file");
            }
            try {
              setUploading(true);
              setUploadProgress(0);
              const formData = new FormData();
              formData.append("file", originFile);
              formData.append("loanCycleNo", loanCycleNo);
              if (vals.name) formData.append("name", vals.name);
              if (vals.type) formData.append("type", vals.type);
              if (vals.source) formData.append("source", vals.source);
              const res = await api.post(
                `/loans/account/${accountId}/documents/upload`,
                formData,
                {
                  headers: { "Content-Type": "multipart/form-data" },
                  onUploadProgress: (e) => {
                    if (e.total) {
                      const pct = Math.round((e.loaded / e.total) * 100);
                      setUploadProgress(pct);
                    }
                  },
                }
              );
              if (res.data.success) {
                message.success("File uploaded");
                setShowUpload(false);
                setUploadProgress(0);
                fetchDocs();
              } else {
                message.error(res.data.message || "Upload failed");
              }
            } catch (err) {
              console.error(err);
              message.error("Upload error");
            } finally {
              setUploading(false);
            }
          }}
        >
          <Form.Item
            label="Display Name"
            name="name"
            rules={[{ required: true, message: "Provide a display name" }]}
          >
            <Input placeholder="e.g., Valid ID (Back)" />
          </Form.Item>
          <Form.Item label="Type" name="type">
            <Select allowClear placeholder="Select / type">
              <Select.Option value="image">Image</Select.Option>
              <Select.Option value="pdf">PDF</Select.Option>
              <Select.Option value="doc">Doc</Select.Option>
              <Select.Option value="sheet">Sheet</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Source" name="source">
            <Input placeholder="upload (default)" />
          </Form.Item>
          <Form.Item
            label="File"
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => (e && e.fileList ? e.fileList : [])}
            rules={[{ required: true, message: "Select a file" }]}
          >
            <Upload.Dragger
              multiple={false}
              beforeUpload={() => false}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              style={{ padding: 12 }}
            >
              <p className="ant-upload-drag-icon">
                {uploading ? <LoadingOutlined /> : <UploadOutlined />}
              </p>
              <p className="ant-upload-text">Click or drag file to this area</p>
              <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                Supported: PDF, Images, Doc, Sheets.
              </p>
            </Upload.Dragger>
          </Form.Item>
          {uploading && (
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={uploadProgress}
                size="small"
                status={uploadProgress === 100 ? "success" : "active"}
              />
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
