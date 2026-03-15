import React from "react";
import { Button, Typography, Tag, Space, Divider, Tooltip, Avatar } from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FolderOutlined,
  InboxOutlined,
  PaperClipOutlined,
  ExclamationCircleOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

function MessageDetail({ message: msg, folder, onBack, onReply, onMove, onPermanentDelete }) {
  if (!msg) return null;

  const senderName = msg.sender?.FullName || msg.sender?.Username || "Unknown";
  const recipientNames = (msg.recipients || [])
    .map((r) => r.FullName || r.Username)
    .join(", ");

  return (
    <div className="message-detail">
      {/* Header */}
      <div className="message-detail-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
            Back
          </Button>
          <Space>
            {folder !== "archived" && (
              <Tooltip title="Archive">
                <Button
                  icon={<FolderOutlined />}
                  size="small"
                  onClick={() => onMove(msg._id, "archived")}
                >
                  Archive
                </Button>
              </Tooltip>
            )}
            {folder === "archived" && (
              <Tooltip title="Move to Inbox">
                <Button
                  icon={<InboxOutlined />}
                  size="small"
                  onClick={() => onMove(msg._id, "inbox")}
                >
                  Inbox
                </Button>
              </Tooltip>
            )}
            {folder === "deleted" && (
              <>
                <Button
                  icon={<InboxOutlined />}
                  size="small"
                  onClick={() => onMove(msg._id, "inbox")}
                >
                  Restore
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => onPermanentDelete(msg._id)}
                >
                  Delete Forever
                </Button>
              </>
            )}
            {folder !== "deleted" && (
              <Tooltip title="Delete">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => onMove(msg._id, "deleted")}
                />
              </Tooltip>
            )}
          </Space>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Title level={4} style={{ margin: 0, flex: 1 }}>
            {msg.subject || "(No Subject)"}
          </Title>
          {msg.isRouting && <Tag color="blue" icon={<NodeIndexOutlined />}>Loan Route</Tag>}
          {msg.priority === "urgent" && <Tag color="red" icon={<ExclamationCircleOutlined />}>Urgent</Tag>}
          {msg.priority === "low" && <Tag color="default">Low Priority</Tag>}
        </div>

        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>From: </Text>
            <Text>{senderName}</Text>
            {msg.sender?.Position && (
              <Text type="secondary"> ({msg.sender.Position})</Text>
            )}
          </div>
          <Text type="secondary">{dayjs(msg.createdAt).format("MMM DD, YYYY hh:mm A")}</Text>
        </div>
        <div>
          <Text strong>To: </Text>
          <Text>{recipientNames}</Text>
        </div>
      </div>

      {/* Body */}
      <div className="message-detail-body">
        <Paragraph style={{ whiteSpace: "pre-wrap" }}>{msg.body}</Paragraph>

        {/* Loan Application info if routing */}
        {msg.isRouting && msg.loanApplication && (
          <>
            <Divider>Loan Application Details</Divider>
            <div style={{ background: "#f6f8fa", padding: 16, borderRadius: 8 }}>
              <Space direction="vertical" size={4}>
                <Text><strong>Account ID:</strong> {msg.loanApplication.AccountId || "—"}</Text>
                <Text>
                  <strong>Applicant:</strong>{" "}
                  {[msg.loanApplication.FirstName, msg.loanApplication.MiddleName, msg.loanApplication.LastName]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
                <Text><strong>Loan Amount:</strong> ₱{(msg.loanApplication.LoanAmount || 0).toLocaleString()}</Text>
                <Text><strong>Status:</strong> {msg.loanApplication.Status || "—"}</Text>
              </Space>
            </div>
          </>
        )}
      </div>

      {/* Attachments */}
      {msg.attachments && msg.attachments.length > 0 && (
        <div className="message-detail-attachments">
          <Text strong style={{ marginBottom: 8, display: "block" }}>
            <PaperClipOutlined /> Attachments ({msg.attachments.length})
          </Text>
          <Space wrap>
            {msg.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.webViewLink || att.webContentLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Tag color="processing" style={{ cursor: "pointer" }}>
                  <PaperClipOutlined /> {att.fileName}
                  {att.fileSize && (
                    <Text type="secondary" style={{ marginLeft: 4 }}>
                      ({(att.fileSize / 1024).toFixed(1)} KB)
                    </Text>
                  )}
                </Tag>
              </a>
            ))}
          </Space>
        </div>
      )}

      {/* Reply */}
      <div className="message-detail-actions">
        <Button type="primary" onClick={() => onReply(msg)}>
          Reply
        </Button>
      </div>
    </div>
  );
}

export default MessageDetail;
