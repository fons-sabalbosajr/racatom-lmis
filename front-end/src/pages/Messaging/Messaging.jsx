import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Menu,
  Button,
  List,
  Badge,
  Typography,
  Tag,
  Space,
  Tooltip,
  Empty,
  Pagination,
  Dropdown,
  Input,
} from "antd";
import {
  InboxOutlined,
  SendOutlined,
  DeleteOutlined,
  FolderOutlined,
  EditOutlined,
  MailOutlined,
  ReloadOutlined,
  SettingOutlined,
  SearchOutlined,
  PaperClipOutlined,
  NodeIndexOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import api from "../../utils/axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import ComposeModal from "./ComposeModal";
import MessageDetail from "./MessageDetail";
import RouteLoanModal from "./RouteLoanModal";
import MessagingSettings from "./MessagingSettings";
import GroupChatPanel from "./GroupChatPanel";
import "./messaging.css";
import { swalMessage, swalConfirm } from "../../utils/swal";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const FOLDERS = [
  { key: "inbox", label: "Inbox", icon: <InboxOutlined /> },
  { key: "sent", label: "Sent Items", icon: <SendOutlined /> },
  { key: "archived", label: "Archived", icon: <FolderOutlined /> },
  { key: "deleted", label: "Deleted", icon: <DeleteOutlined /> },
];

function Messaging() {
  const [folder, setFolder] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [routeLoanOpen, setRouteLoanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupChatUnread, setGroupChatUnread] = useState(0);

  const limit = 20;

  const fetchMessages = useCallback(async () => {
    if (folder === "group-chats") return;
    setLoading(true);
    try {
      const queryFolder = folder === "deleted" && folder === "sent" ? "deleted-sent" : folder;
      const res = await api.get("/messages", {
        params: { folder: queryFolder, page, limit },
      });
      setMessages(res.data.messages || []);
      setTotal(res.data.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [folder, page]);

  const fetchUnread = useCallback(async () => {
    try {
      const [msgRes, grpRes] = await Promise.all([
        api.get("/messages/unread-count"),
        api.get("/group-chats/unread-count"),
      ]);
      setUnreadCount(msgRes.data.count || 0);
      setGroupChatUnread(grpRes.data.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleFolderChange = ({ key }) => {
    if (key === "settings") {
      setSettingsOpen(true);
      return;
    }
    setFolder(key);
    setPage(1);
    setSelectedMsg(null);
  };

  const handleSelectMessage = async (msg) => {
    try {
      const res = await api.get(`/messages/${msg._id}`);
      setSelectedMsg(res.data.message);
      fetchUnread();
    } catch {
      swalMessage.error("Failed to load message.");
    }
  };

  const handleMove = async (msgId, targetFolder) => {
    try {
      await api.put(`/messages/${msgId}/move`, { folder: targetFolder });
      swalMessage.success(
        targetFolder === "deleted"
          ? "Moved to Deleted"
          : targetFolder === "archived"
          ? "Archived"
          : "Restored to Inbox"
      );
      setSelectedMsg(null);
      fetchMessages();
      fetchUnread();
    } catch {
      swalMessage.error("Failed to move message.");
    }
  };

  const handlePermanentDelete = async (msgId) => {
    swalConfirm({
      title: "Permanently Delete",
      text: "This message will be permanently deleted and cannot be recovered.",
      confirmButtonText: "Delete",
      confirmButtonColor: "#ff4d4f",
      onOk: async () => {
        try {
          await api.delete(`/messages/${msgId}`);
          swalMessage.success("Message permanently deleted.");
          setSelectedMsg(null);
          fetchMessages();
        } catch {
          swalMessage.error("Failed to delete.");
        }
      },
    });
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    setComposeOpen(true);
  };

  const handleComposeSent = () => {
    setComposeOpen(false);
    setReplyTo(null);
    if (folder === "sent") fetchMessages();
    fetchUnread();
  };

  const handleRouteSent = () => {
    setRouteLoanOpen(false);
    if (folder === "sent") fetchMessages();
  };

  // Filter by search
  const filtered = searchTerm
    ? messages.filter(
        (m) =>
          (m.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.body || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.sender?.FullName || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  const menuItems = FOLDERS.map((f) => ({
    key: f.key,
    icon: f.icon,
    label: (
      <span>
        {f.label}
        {f.key === "inbox" && unreadCount > 0 && (
          <Badge
            count={unreadCount}
            size="small"
            style={{ marginLeft: 8 }}
          />
        )}
      </span>
    ),
  }));

  menuItems.push({ type: "divider" });
  menuItems.push({
    key: "group-chats",
    icon: <TeamOutlined />,
    label: (
      <span>
        Group Chats
        {groupChatUnread > 0 && (
          <Badge count={groupChatUnread} size="small" style={{ marginLeft: 8 }} />
        )}
      </span>
    ),
  });
  menuItems.push({ type: "divider" });
  menuItems.push({
    key: "settings",
    icon: <SettingOutlined />,
    label: "Messaging Settings",
  });

  return (
    <div style={{ padding: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          <MailOutlined style={{ marginRight: 8 }} />
          Messages
        </Title>
      </div>

      <div className="messaging-layout">
        {/* Sidebar */}
        <div className="messaging-sidebar">
          <div className="messaging-compose-btn">
            <Space direction="vertical" style={{ width: "100%" }} size={6}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                block
                onClick={() => {
                  setReplyTo(null);
                  setComposeOpen(true);
                }}
              >
                Compose
              </Button>
              <Button
                icon={<NodeIndexOutlined />}
                block
                onClick={() => setRouteLoanOpen(true)}
              >
                Route Loan
              </Button>
            </Space>
          </div>
          <div className="messaging-sidebar-menu">
            <Menu
              mode="inline"
              selectedKeys={[folder]}
              onClick={handleFolderChange}
              items={menuItems}
              style={{ border: "none" }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="messaging-content">
          {folder === "group-chats" ? (
            <GroupChatPanel visible={folder === "group-chats"} />
          ) : selectedMsg ? (
            <MessageDetail
              message={selectedMsg}
              folder={folder}
              onBack={() => setSelectedMsg(null)}
              onReply={handleReply}
              onMove={handleMove}
              onPermanentDelete={handlePermanentDelete}
            />
          ) : (
            <>
              {/* Toolbar */}
              <div className="messaging-toolbar">
                <Space>
                  <Text strong style={{ textTransform: "capitalize" }}>
                    {FOLDERS.find((f) => f.key === folder)?.label || folder}
                  </Text>
                  <Text type="secondary">({total})</Text>
                </Space>
                <Space>
                  <Input
                    placeholder="Search messages..."
                    prefix={<SearchOutlined />}
                    allowClear
                    size="small"
                    style={{ width: 200 }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Tooltip title="Refresh">
                    <Button
                      icon={<ReloadOutlined />}
                      size="small"
                      onClick={fetchMessages}
                      loading={loading}
                    />
                  </Tooltip>
                </Space>
              </div>

              {/* Message List */}
              <div className="messaging-list">
                {filtered.length === 0 ? (
                  <div className="messaging-empty">
                    <MailOutlined />
                    <Text type="secondary">No messages in this folder</Text>
                  </div>
                ) : (
                  <List
                    dataSource={filtered}
                    loading={loading}
                    renderItem={(item) => {
                      const isUnread = !item.isRead && folder !== "sent";
                      const deletedAt = item.recipientStates?.find(
                        (s) => s.folder === "deleted"
                      )?.deletedAt;
                      const daysLeft = deletedAt
                        ? 30 - dayjs().diff(dayjs(deletedAt), "day")
                        : null;

                      return (
                        <List.Item
                          className={isUnread ? "unread" : ""}
                          onClick={() => handleSelectMessage(item)}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              width: "100%",
                              gap: 12,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Text
                                  strong={isUnread}
                                  style={{ fontSize: 13 }}
                                >
                                  {folder === "sent"
                                    ? `To: ${item.recipients?.map((r) => r.FullName || r.Username).join(", ") || "—"}`
                                    : item.sender?.FullName || item.sender?.Username || "Unknown"}
                                </Text>
                                {item.isRouting && (
                                  <Tag color="blue" className="message-item-routing-badge">
                                    Route
                                  </Tag>
                                )}
                                {item.priority === "urgent" && (
                                  <Tag color="red">Urgent</Tag>
                                )}
                                {item.attachments?.length > 0 && (
                                  <PaperClipOutlined style={{ color: "#999" }} />
                                )}
                              </div>
                              <div className="message-item-subject">
                                {item.subject || "(No Subject)"}
                              </div>
                              <div className="message-item-body-preview">
                                {(item.body || "").slice(0, 100)}
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div className="message-item-date">
                                {dayjs(item.createdAt).fromNow()}
                              </div>
                              {folder === "deleted" && daysLeft !== null && (
                                <div className="deleted-countdown">
                                  {daysLeft > 0
                                    ? `${daysLeft}d left`
                                    : "Expiring soon"}
                                </div>
                              )}
                            </div>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </div>

              {/* Pagination */}
              {total > limit && (
                <div
                  style={{ padding: "8px 16px", textAlign: "right", borderTop: "1px solid #f0f0f0" }}
                >
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={limit}
                    size="small"
                    showSizeChanger={false}
                    onChange={(p) => setPage(p)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <ComposeModal
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyTo(null);
        }}
        onSent={handleComposeSent}
        replyTo={replyTo}
      />

      {/* Route Loan Modal */}
      <RouteLoanModal
        open={routeLoanOpen}
        onClose={() => setRouteLoanOpen(false)}
        onSent={handleRouteSent}
      />

      {/* Messaging Settings */}
      <MessagingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default Messaging;
