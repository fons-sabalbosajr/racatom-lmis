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
  Dropdown,
  Progress,
  Select,
} from "antd";
import { PlusOutlined, UploadOutlined, EyeOutlined, MoreOutlined, LoadingOutlined } from "@ant-design/icons";
import api, { API_BASE_URL } from "../../../utils/axios";

const { Text } = Typography;

export default function LoanDocumentsTab({
  loan,
  accountId: accountIdProp,
  cycles,
  selectedLoanNo,
  onDocumentsChanged,
}) {
  const derivedAccountId =
    accountIdProp ||
    loan?.loanInfo?.accountId ||
    loan?.accountId ||
    loan?.AccountId ||
    loan?.AccountID ||
    loan?.AccountIdNo;
  const accountId = derivedAccountId || "";

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
  const effectiveLoanCycleNo = selectedLoanNo || loanCycleNo;
  const clientNo = loan?.clientNo || loan?.loanInfo?.clientNo || loan?.ClientNo || "";

  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm] = Form.useForm();

  const API_ORIGIN = (API_BASE_URL || "").replace(/\/+api\/?$/i, "");

  const legacyCopy = (text) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    return legacyCopy(text);
  };

  const fetchDocs = async () => {
    try {
      setLoading(true);
      let res;
      if (accountId && selectedLoanNo) {
        res = await api.get(`/loans/account/${accountId}/cycle/${selectedLoanNo}/documents`);
      } else if (clientNo) {
        res = await api.get(`/loans/client/${clientNo}/documents`);
      } else if (accountId && loanCycleNo) {
        res = await api.get(`/loans/account/${accountId}/cycle/${loanCycleNo}/documents`);
      } else {
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, selectedLoanNo, loanCycleNo, clientNo]);

  const handleAdd = () => {
    form.resetFields();
    setShowAdd(true);
  };

  const submitAdd = async () => {
    try {
      const values = await form.validateFields();
      if (!accountId || !effectiveLoanCycleNo)
        return message.warning("Missing account or cycle");
      const payload = {
        name: values.name,
        link: values.link,
        type: values.type,
        source: values.source,
        loanCycleNo: effectiveLoanCycleNo,
      };
      const res = await api.post(`/loans/account/${accountId}/documents/link`, payload);
      if (res.data.success) {
        message.success("Link saved");
        setShowAdd(false);
        fetchDocs();
        try {
          onDocumentsChanged && onDocumentsChanged();
        } catch {}
      } else {
        message.error(res.data.message || "Failed to save");
      }
    } catch (err) {
      // ignore validation
    }
  };

  const resolveUrl = (raw) => {
    if (!raw) return "";
    if (/^https?:/i.test(raw)) return raw;
    if (raw.startsWith("/uploads/")) return API_ORIGIN + raw;
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
            try {
              onDocumentsChanged && onDocumentsChanged();
            } catch {}
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
      render: (text) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || "Untitled"}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (t) => {
        const colorMap = { pdf: "red", image: "gold", doc: "blue", sheet: "green", other: "default" };
        return <Tag color={colorMap[t] || "default"}>{t?.toUpperCase() || "N/A"}</Tag>;
      },
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 130,
      render: (s) => <Tag color={s === "Google Drive" ? "green" : "default"}>{s || "—"}</Tag>,
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
            onClick: async () => {
              const url = resolveUrl(record.link || record.url);
              if (!url) return message.info("No URL available");
              const ok = await copyToClipboard(url);
              if (ok) message.success("Link copied");
              else message.error("Copy failed. You can copy manually from the Open link.");
            },
          },
          null,
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
                  if (url) window.open(url, "_blank", "noopener");
                }}
              >
                Open
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
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            if (!accountId) {
              message.warning("No AccountId detected yet – select a loan first.");
              return;
            }
            handleAdd();
          }}
        >
          Add Link
        </Button>
        <Button
          icon={<UploadOutlined />}
          loading={uploading}
          onClick={() => {
            if (!accountId) {
              message.warning("No account selected yet – open a loan first.");
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
            {selectedLoanNo ? ` | Loan No: ${selectedLoanNo}` : loanCycleNo ? ` | Cycle: ${loanCycleNo}` : ""}
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
        locale={{ emptyText: accountId ? "No documents yet" : "No account selected" }}
      />

      {/* Add link modal */}
      <Modal
        title={`Add Document Link${accountId ? ` – ${accountId}` : ""}${
          effectiveLoanCycleNo ? ` (Cycle ${effectiveLoanCycleNo})` : ""
        }${loan?.fullName ? ` | ${loan.fullName}` : ""}`}
        open={showAdd}
        onOk={submitAdd}
        onCancel={() => setShowAdd(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Space size={16} direction="vertical" style={{ width: "100%", marginBottom: 8 }}>
            {accountId && (
              <Text type="secondary" style={{ display: "block" }}>
                Account: <strong>{accountId}</strong>
              </Text>
            )}
            {effectiveLoanCycleNo && (
              <Text type="secondary" style={{ display: "block" }}>
                Loan Cycle: <strong>{effectiveLoanCycleNo}</strong>
              </Text>
            )}
          </Space>
          <Form.Item label="Display Name" name="name" rules={[{ required: true, message: "Please enter a name" }]}>
            <Input placeholder="e.g., Valid ID (Front)" />
          </Form.Item>
          <Form.Item label="Link (Google Drive or external)" name="link" rules={[{ required: true, message: "Please paste a link" }]}>
            <Input placeholder="https://drive.google.com/file/..." />
          </Form.Item>
          <Form.Item label="Type (optional)" name="type">
            <Input placeholder="pdf, image, doc, sheet, other" />
          </Form.Item>
          <Form.Item label="Source (auto if blank)" name="source">
            <Input placeholder="Google Drive" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Upload modal */}
      <Modal
        title={`Upload Document${accountId ? ` – ${accountId}` : ""}${
          effectiveLoanCycleNo ? ` (Cycle ${effectiveLoanCycleNo})` : ""
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
            const fileList = Array.isArray(vals.file) ? vals.file : vals.file ? [vals.file] : [];
            const originFiles = fileList
              .map((fi) => fi?.originFileObj || fi?.file || fi?.file?.originFileObj)
              .filter(Boolean);
            if (!originFiles.length) {
              return message.warning("Please choose at least one file");
            }
            const chosenLoanNo = vals.loanNo || effectiveLoanCycleNo;
            if (!chosenLoanNo) {
              return message.warning("Please choose a Loan No to attach these files to");
            }
            try {
              setUploading(true);
              setUploadProgress(0);
              const formData = new FormData();
              originFiles.forEach((of) => formData.append("file", of));
              formData.append("loanCycleNo", chosenLoanNo);
              if (vals.name) formData.append("name", vals.name);
              if (vals.type) formData.append("type", vals.type);
              if (vals.source) formData.append("source", vals.source);
              const res = await api.post(`/loans/account/${accountId}/documents/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (e) => {
                  if (e.total) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(pct);
                  }
                },
              });
              if (res.data.success) {
                message.success("Upload complete");
                setShowUpload(false);
                setUploadProgress(0);
                fetchDocs();
                try {
                  onDocumentsChanged && onDocumentsChanged();
                } catch {}
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
            label="Loan No"
            name="loanNo"
            rules={[{ required: true, message: "Select the Loan No for these files" }]}
            initialValue={effectiveLoanCycleNo || undefined}
          >
            <Select placeholder="Select Loan No" showSearch optionFilterProp="children" disabled={uploading}>
              {(Array.isArray(cycles) ? cycles : [])
                .map((c) => c?.LoanNo || c?.LoanCycleNo || c?.loanNo)
                .filter(Boolean)
                .map((ln) => (
                  <Select.Option key={ln} value={ln}>
                    {ln}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item label="Display Name" name="name" rules={[{ required: true, message: "Provide a display name" }]}>
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
            rules={[{ required: true, message: "Select file(s)" }]}
          >
            <Upload.Dragger
              multiple
              beforeUpload={() => false}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              style={{ padding: 12 }}
            >
              <p className="ant-upload-drag-icon">{uploading ? <LoadingOutlined /> : <UploadOutlined />}</p>
              <p className="ant-upload-text">Click or drag files to this area</p>
              <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                Supported: PDF, Images, Doc, Sheets. Multiple selection allowed.
              </p>
            </Upload.Dragger>
          </Form.Item>
          {uploading && (
            <div style={{ marginTop: 8 }}>
              <Progress percent={uploadProgress} size="small" status={uploadProgress === 100 ? "success" : "active"} />
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
