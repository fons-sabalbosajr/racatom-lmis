import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  List,
  Input,
  Button,
  Avatar,
  Typography,
  Space,
  Tag,
  Badge,
  Select,
  Form,
  Switch,
  Tooltip,
  Popconfirm,
  Empty,
  Divider,
  Dropdown,
} from "antd";
import {
  TeamOutlined,
  SendOutlined,
  PlusOutlined,
  SettingOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  CrownOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  PaperClipOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import api from "../../utils/axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { swalMessage, swalConfirm } from "../../utils/swal";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─── Create Group Modal ───
const CreateGroupModal = ({ open, onClose, onCreated, staffUsers }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleCreate = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/group-chats", {
        name: values.name,
        description: values.description,
        members: values.members || [],
        settings: {
          onlyAdminsCanPost: values.onlyAdminsCanPost || false,
        },
      });
      if (res.data?.success) {
        swalMessage.success("Group chat created");
        form.resetFields();
        onCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      swalMessage.error(err?.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Create Group Chat"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleCreate}>
        <Form.Item name="name" label="Group Name" rules={[{ required: true, message: "Enter group name" }]}>
          <Input placeholder="e.g. Loan Officers, Management Team" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="Brief description (optional)" />
        </Form.Item>
        <Form.Item name="members" label="Members">
          <Select
            mode="multiple"
            placeholder="Search or select members..."
            showSearch
            optionFilterProp="label"
            optionLabelProp="label"
            maxTagCount="responsive"
          >
            {Object.entries(
              staffUsers.reduce((groups, u) => {
                const pos = u.Position || "Other";
                if (!groups[pos]) groups[pos] = [];
                groups[pos].push(u);
                return groups;
              }, {})
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([position, users]) => (
                <Select.OptGroup key={position} label={position}>
                  {users.map((u) => (
                    <Select.Option key={u._id} value={u._id} label={u.FullName}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{u.FullName}</span>
                        <span style={{ fontSize: 11, color: "#999" }}>{u.Username}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
          </Select>
        </Form.Item>
        <Form.Item name="onlyAdminsCanPost" valuePropName="checked" label="Only Admins Can Post">
          <Switch />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Create Group
        </Button>
      </Form>
    </Modal>
  );
};

// ─── Group Settings Modal ───
const GroupSettingsModal = ({ open, onClose, group, onUpdated, staffUsers }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [newMembers, setNewMembers] = useState([]);

  useEffect(() => {
    if (group && open) {
      form.setFieldsValue({
        name: group.name,
        description: group.description,
        onlyAdminsCanPost: group.settings?.onlyAdminsCanPost || false,
      });
    }
  }, [group, open, form]);

  const currentUserId = (() => {
    try {
      const data = sessionStorage.getItem("userData") || localStorage.getItem("userData");
      return data ? JSON.parse(data)?._id : null;
    } catch { return null; }
  })();

  const isAdmin = group?.admins?.some((a) => String(a._id || a) === String(currentUserId));

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const res = await api.put(`/group-chats/${group._id}`, {
        name: values.name,
        description: values.description,
        settings: { onlyAdminsCanPost: values.onlyAdminsCanPost },
      });
      if (res.data?.success) {
        swalMessage.success("Group updated");
        onUpdated(res.data.data);
      }
    } catch (err) {
      swalMessage.error(err?.response?.data?.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (newMembers.length === 0) return;
    try {
      const res = await api.post(`/group-chats/${group._id}/members`, { memberIds: newMembers });
      if (res.data?.success) {
        swalMessage.success("Members added");
        onUpdated(res.data.data);
        setNewMembers([]);
        setAddMembersOpen(false);
      }
    } catch (err) {
      swalMessage.error(err?.response?.data?.message || "Failed to add members");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await api.delete(`/group-chats/${group._id}/members`, { data: { memberId } });
      if (res.data?.success) {
        onUpdated(res.data.data);
        swalMessage.success("Member removed");
      }
    } catch (err) {
      swalMessage.error(err?.response?.data?.message || "Failed to remove member");
    }
  };

  const handleToggleAdmin = async (memberId) => {
    try {
      const res = await api.put(`/group-chats/${group._id}/toggle-admin`, { memberId });
      if (res.data?.success) {
        onUpdated(res.data.data);
      }
    } catch (err) {
      swalMessage.error(err?.response?.data?.message || "Failed");
    }
  };

  if (!group) return null;

  const existingMemberIds = group.members?.map((m) => String(m._id || m)) || [];
  const availableStaff = staffUsers.filter((u) => !existingMemberIds.includes(String(u._id)));

  return (
    <Modal
      title="Group Settings"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item name="name" label="Group Name" rules={[{ required: true }]}>
          <Input disabled={!isAdmin} />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} disabled={!isAdmin} />
        </Form.Item>
        <Form.Item name="onlyAdminsCanPost" valuePropName="checked" label="Only Admins Can Post">
          <Switch disabled={!isAdmin} />
        </Form.Item>
        {isAdmin && (
          <Button type="primary" htmlType="submit" loading={loading} size="small">
            Save Settings
          </Button>
        )}
      </Form>

      <Divider />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text strong>Members ({group.members?.length || 0})</Text>
        <Button size="small" icon={<UserAddOutlined />} onClick={() => setAddMembersOpen(true)}>
          Add Members
        </Button>
      </div>

      {addMembersOpen && (
        <div style={{ marginBottom: 12 }}>
          <Select
            mode="multiple"
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="Search or select users to add..."
            value={newMembers}
            onChange={setNewMembers}
            showSearch
            optionFilterProp="label"
            optionLabelProp="label"
            maxTagCount="responsive"
          >
            {Object.entries(
              availableStaff.reduce((groups, u) => {
                const pos = u.Position || "Other";
                if (!groups[pos]) groups[pos] = [];
                groups[pos].push(u);
                return groups;
              }, {})
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([position, users]) => (
                <Select.OptGroup key={position} label={position}>
                  {users.map((u) => (
                    <Select.Option key={u._id} value={u._id} label={u.FullName}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{u.FullName}</span>
                        <span style={{ fontSize: 11, color: "#999" }}>{u.Username}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
          </Select>
          <Space>
            <Button size="small" type="primary" onClick={handleAddMembers}>Add</Button>
            <Button size="small" onClick={() => { setAddMembersOpen(false); setNewMembers([]); }}>Cancel</Button>
          </Space>
        </div>
      )}

      <List
        size="small"
        dataSource={group.members || []}
        renderItem={(member) => {
          const memberId = String(member._id || member);
          const isMemberAdmin = group.admins?.some((a) => String(a._id || a) === memberId);
          const isCreator = String(group.creator?._id || group.creator) === memberId;

          return (
            <List.Item
              actions={
                isAdmin && !isCreator
                  ? [
                      <Tooltip title={isMemberAdmin ? "Remove Admin" : "Make Admin"} key="admin">
                        <Button
                          type="text"
                          size="small"
                          icon={<CrownOutlined style={{ color: isMemberAdmin ? "#faad14" : "#d9d9d9" }} />}
                          onClick={() => handleToggleAdmin(memberId)}
                        />
                      </Tooltip>,
                      <Popconfirm
                        key="remove"
                        title="Remove this member?"
                        onConfirm={() => handleRemoveMember(memberId)}
                      >
                        <Button type="text" size="small" danger icon={<UserDeleteOutlined />} />
                      </Popconfirm>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                avatar={<Avatar size="small">{(member.FullName || "?")[0]}</Avatar>}
                title={
                  <span>
                    {member.FullName || member.Username}
                    {isCreator && <Tag color="gold" style={{ marginLeft: 6, fontSize: 10 }}>Creator</Tag>}
                    {isMemberAdmin && !isCreator && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>Admin</Tag>}
                  </span>
                }
                description={member.Position || ""}
              />
            </List.Item>
          );
        }}
      />
    </Modal>
  );
};

// ─── Group Chat View (conversation) ───
const GroupChatView = ({ group, onBack, onSettingsOpen, onGroupUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUserId = (() => {
    try {
      const data = sessionStorage.getItem("userData") || localStorage.getItem("userData");
      return data ? JSON.parse(data)?._id : null;
    } catch { return null; }
  })();

  const fetchMessages = useCallback(async () => {
    if (!group?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`/group-chats/${group._id}/messages`, {
        params: { limit: 100 },
      });
      if (res.data?.success) {
        setMessages(res.data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [group?._id]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const hasText = newMessage.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;
    if (!hasText && !hasFiles) return;

    setSending(true);
    try {
      let res;
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append("body", newMessage.trim() || " ");
        selectedFiles.forEach((f) => formData.append("file", f));
        res = await api.post(`/group-chats/${group._id}/messages`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post(`/group-chats/${group._id}/messages`, {
          body: newMessage.trim(),
        });
      }
      if (res.data?.success) {
        setMessages((prev) => [...prev, res.data.data]);
        setNewMessage("");
        setSelectedFiles([]);
      }
    } catch (err) {
      swalMessage.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // Limit total size to 15MB per file
    const valid = files.filter((f) => f.size <= 15 * 1024 * 1024);
    if (valid.length < files.length) {
      swalMessage.warning("Some files exceed the 15MB limit and were skipped");
    }
    setSelectedFiles((prev) => [...prev, ...valid]);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isImageMime = (mime) => mime && mime.startsWith("image/");

  const getFileIcon = (mime) => {
    if (!mime) return <FileOutlined />;
    if (mime.startsWith("image/")) return <FileImageOutlined />;
    if (mime.includes("pdf")) return <FilePdfOutlined />;
    return <FileOutlined />;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() || selectedFiles.length > 0) handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #f0f0f0",
          gap: 8,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} />
        <Avatar style={{ backgroundColor: "#1677ff" }} icon={<TeamOutlined />} />
        <div style={{ flex: 1 }}>
          <Text strong>{group.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {group.members?.length || 0} members
          </Text>
        </div>
        <Button type="text" icon={<SettingOutlined />} onClick={onSettingsOpen} />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {messages.length === 0 && !loading && (
          <Empty description="No messages yet. Start the conversation!" />
        )}
        {messages.map((msg) => {
          const isMine = String(msg.sender?._id || msg.sender) === String(currentUserId);

          if (msg.isSystem) {
            return (
              <div key={msg._id} style={{ textAlign: "center", margin: "4px 0" }}>
                <Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                  {msg.body} • {dayjs(msg.createdAt).fromNow()}
                </Text>
              </div>
            );
          }

          return (
            <div
              key={msg._id}
              style={{
                display: "flex",
                justifyContent: isMine ? "flex-end" : "flex-start",
                gap: 6,
              }}
            >
              {!isMine && (
                <Avatar size="small" style={{ flexShrink: 0, marginTop: 2 }}>
                  {(msg.sender?.FullName || "?")[0]}
                </Avatar>
              )}
              <div
                style={{
                  maxWidth: "70%",
                  background: isMine ? "#1677ff" : "#f5f5f5",
                  color: isMine ? "#fff" : "inherit",
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                {!isMine && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                    {msg.sender?.FullName || msg.sender?.Username}
                  </div>
                )}
                {msg.body && msg.body.trim() && msg.body.trim() !== " " && (
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.body}</div>
                )}
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                    {msg.attachments.map((att, ai) => (
                      isImageMime(att.mimeType) ? (
                        <a key={ai} href={att.webViewLink} target="_blank" rel="noopener noreferrer">
                          <img
                            src={att.webContentLink || att.webViewLink}
                            alt={att.fileName}
                            style={{
                              maxWidth: "100%",
                              maxHeight: 200,
                              borderRadius: 6,
                              cursor: "pointer",
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          key={ai}
                          href={att.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            background: isMine ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.04)",
                            borderRadius: 6,
                            color: isMine ? "#fff" : "#1677ff",
                            fontSize: 12,
                            textDecoration: "none",
                          }}
                        >
                          {getFileIcon(att.mimeType)}
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {att.fileName}
                          </span>
                          <DownloadOutlined />
                        </a>
                      )
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 10,
                    textAlign: "right",
                    opacity: 0.7,
                    marginTop: 2,
                  }}
                >
                  {dayjs(msg.createdAt).format("h:mm A")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {selectedFiles.length > 0 && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "6px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {selectedFiles.map((file, idx) => (
            <Tag
              key={idx}
              closable
              onClose={() => removeFile(idx)}
              style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {file.type?.startsWith("image/") ? <FileImageOutlined /> : <FileOutlined />}{" "}
              {file.name}
            </Tag>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ borderTop: "1px solid #f0f0f0", padding: 8, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
          onChange={handleFileSelect}
        />
        <Tooltip title="Attach file">
          <Button
            type="text"
            icon={<PaperClipOutlined />}
            onClick={() => fileInputRef.current?.click()}
            style={{ flexShrink: 0 }}
          />
        </Tooltip>
        <TextArea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
          disabled={!newMessage.trim() && selectedFiles.length === 0}
        />
      </div>
    </div>
  );
};

// ─── Main GroupChat Component ───
const GroupChatPanel = ({ visible }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupUnread, setGroupUnread] = useState(0);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/group-chats");
      if (res.data?.success) setGroups(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get("/messages/staff-users");
      if (res.data?.success) setStaffUsers(res.data.users || []);
    } catch {
      // silent
    }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/group-chats/unread-count");
      if (res.data?.success) setGroupUnread(res.data.count || 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchGroups();
      fetchStaff();
      fetchUnread();
    }
  }, [visible, fetchGroups, fetchStaff, fetchUnread]);

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
  };

  const handleGroupUpdated = (updatedGroup) => {
    setGroups((prev) => prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)));
    if (selectedGroup?._id === updatedGroup._id) setSelectedGroup(updatedGroup);
  };

  if (selectedGroup) {
    return (
      <>
        <GroupChatView
          group={selectedGroup}
          onBack={() => {
            setSelectedGroup(null);
            fetchGroups();
            fetchUnread();
          }}
          onSettingsOpen={() => setSettingsOpen(true)}
          onGroupUpdated={handleGroupUpdated}
        />
        <GroupSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          group={selectedGroup}
          onUpdated={handleGroupUpdated}
          staffUsers={staffUsers}
        />
      </>
    );
  }

  return (
    <div style={{ height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <TeamOutlined />
          <Text strong>Group Chats</Text>
          {groupUnread > 0 && <Badge count={groupUnread} size="small" />}
        </Space>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          New Group
        </Button>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {groups.length === 0 && !loading ? (
          <Empty
            description="No group chats yet"
            style={{ marginTop: 40 }}
          />
        ) : (
          <List
            dataSource={groups}
            loading={loading}
            renderItem={(group) => (
              <List.Item
                onClick={() => setSelectedGroup(group)}
                style={{ cursor: "pointer", padding: "8px 12px" }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: "#1677ff" }} icon={<TeamOutlined />} />
                  }
                  title={group.name}
                  description={
                    <span style={{ fontSize: 12 }}>
                      {group.lastMessage?.body
                        ? `${group.lastMessage.body.slice(0, 50)}${group.lastMessage.body.length > 50 ? "..." : ""}`
                        : `${group.members?.length || 0} members`}
                      {group.lastMessage?.sentAt && (
                        <span style={{ marginLeft: 8, color: "#999" }}>
                          {dayjs(group.lastMessage.sentAt).fromNow()}
                        </span>
                      )}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleGroupCreated}
        staffUsers={staffUsers}
      />
    </div>
  );
};

export default GroupChatPanel;
