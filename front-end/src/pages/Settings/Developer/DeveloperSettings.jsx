import React, { useEffect, useState } from "react";
import { Typography, Divider, Switch, Space, Alert, Collapse, Button, Table, Select, message, Spin, Form, Input, Modal, ColorPicker, Radio } from "antd";
import { useDevSettings } from "../../../context/DevSettingsContext";
import api from "../../../utils/axios";
import "./devsettings.css";

const { Title, Text } = Typography;

export default function DeveloperSettings() {
  const { settings, setSetting, resetSettings } = useDevSettings();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [tempPwdModal, setTempPwdModal] = useState({ open: false, user: null });
  const [tempPwdValue, setTempPwdValue] = useState("");
  const [sendingReset, setSendingReset] = useState({}); // { [userId]: boolean }
  const [verifying, setVerifying] = useState({}); // { [userId]: boolean }
  const [positionUpdating, setPositionUpdating] = useState({}); // { [userId]: boolean }
  const [tempPwdSubmitting, setTempPwdSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/users");
      const list = Array.isArray(res.data) ? res.data : [];
      // Deduplicate by Username (fallback _id)
      const seen = new Set();
      const unique = [];
      for (const u of list) {
        const key = (u && (u.Username || u._id)) ?? Math.random().toString();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(u);
        }
      }
      setUsers(unique);
    } catch (err) {
      console.error(err);
      message.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const roleDefaults = [
    "Developer",
    "Admin",
    "Manager",
    "Supervisor",
    "Collector",
    "Teller",
    "Staff",
    "Auditor",
    "Guest",
  ];

  const roleOptions = () => {
    const existing = Array.from(
      new Set(users.map((u) => (u.Position || "").trim()).filter(Boolean))
    );
    const merged = Array.from(new Set([...existing, ...roleDefaults]));
    return merged.map((r) => ({ label: r, value: r }));
  };

  const updateUserPosition = async (user, newPos) => {
    const old = user.Position;
    // optimistic UI
    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, Position: newPos } : u)));
    try {
      setPositionUpdating((prev) => ({ ...prev, [user._id]: true }));
      await api.put(`/users/${user._id}`, { Position: newPos });
      message.success(`Updated ${user.FullName}'s position to ${newPos}`);
    } catch (err) {
      console.error(err);
      message.error("Failed to update position");
      // rollback
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, Position: old } : u)));
    } finally {
      setPositionUpdating((prev) => ({ ...prev, [user._id]: false }));
    }
  };

  const toggleVerified = async (user, newVal) => {
    const old = !!user.isVerified;
    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isVerified: newVal } : u)));
    try {
      setVerifying((prev) => ({ ...prev, [user._id]: true }));
      await api.put(`/users/${user._id}`, { isVerified: newVal });
      message.success(`${user.FullName} is now ${newVal ? "verified" : "unverified"}`);
    } catch (err) {
      console.error(err);
      message.error("Failed to update verification status");
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isVerified: old } : u)));
    } finally {
      setVerifying((prev) => ({ ...prev, [user._id]: false }));
    }
  };
  
  // small helper for consistent row layout
  const SettingRow = ({ label, checked, onChange, children }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "4px 0",
      }}
    >
      <span className="setting-row-label" style={{ flex: 1 }}>{label}</span>
      {children ?? (
        <Switch checked={checked} onChange={onChange} />
      )}
    </div>
  );

  const userHierarchyPanel = {
    key: "user-hierarchy",
    label: "User Hierarchy",
    children: (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <Text type="secondary">Manage user positions/roles. Changes save instantly.</Text>
          <Button onClick={fetchUsers} size="small">Refresh</Button>
        </div>
        {loadingUsers ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Spin size="small" /> <span>Loading users…</span>
          </div>
        ) : (
          <Table
            size="small"
            rowKey="_id"
            pagination={{ pageSize: 8 }}
            dataSource={users}
            columns={[
              { title: "Full Name", dataIndex: "FullName", key: "FullName" },
              { title: "Username", dataIndex: "Username", key: "Username" },
              {
                title: "Position",
                key: "Position",
                render: (_, record) => (
                  <Select
                    style={{ minWidth: 160 }}
                    showSearch
                    placeholder="Select role"
                    options={roleOptions()}
                    value={record.Position || undefined}
                    onChange={(val) => updateUserPosition(record, val)}
                    loading={!!positionUpdating[record._id]}
                    disabled={!!positionUpdating[record._id]}
                    allowClear
                  />
                ),
              },
              { title: "Email", dataIndex: "Email", key: "Email" },
              { title: "Verified", dataIndex: "isVerified", key: "isVerified", render: (v, r) => (
                <Switch size="small" checked={!!v} onChange={(val) => toggleVerified(r, val)} loading={!!verifying[r._id]} />
              ) },
              {
                title: "Admin Actions",
                key: "actions",
                render: (_, record) => (
                  <Space>
                    <Button size="small" onClick={() => sendResetEmail(record)} loading={!!sendingReset[record._id]}>Send Reset Email</Button>
                    <Button size="small" onClick={() => openTempPwdModal(record)}>Set Temp Password</Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </div>
    ),
  };

  const ChangePasswordPanel = {
    key: "change-password",
    label: "Change My Password",
    children: (
      <ChangePasswordForm />
    ),
  };

  function ChangePasswordForm() {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const onFinish = async (values) => {
      const { oldPassword, newPassword, confirmPassword } = values;
      if (newPassword !== confirmPassword) {
        message.error("New passwords do not match");
        return;
      }
      try {
        setSubmitting(true);
        await api.put("/auth/change-password", { oldPassword, newPassword });
        message.success("Password updated successfully");
        form.resetFields();
      } catch (err) {
        const msg = err?.response?.data?.message || "Failed to update password";
        message.error(msg);
      } finally {
        setSubmitting(false);
      }
    };
    return (
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 420 }}>
        <Form.Item name="oldPassword" label="Current Password" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6 }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="confirmPassword" label="Confirm New Password" dependencies={["newPassword"]} rules={[{ required: true }] }>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Update Password
        </Button>
      </Form>
    );
  }

  const sendResetEmail = async (user) => {
    try {
      setSendingReset((prev) => ({ ...prev, [user._id]: true }));
      await api.post(`/users/${user._id}/reset-password-email`);
      message.success(`Reset link sent to ${user.Email}`);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to send reset email";
      message.error(msg);
    } finally {
      setSendingReset((prev) => ({ ...prev, [user._id]: false }));
    }
  };

  const openTempPwdModal = (user) => {
    setTempPwdValue("");
    setTempPwdModal({ open: true, user });
  };

  const submitTempPwd = async () => {
    if (!tempPwdValue || tempPwdValue.length < 6) {
      message.error("Temporary password must be at least 6 characters");
      return;
    }
    try {
      setTempPwdSubmitting(true);
      await api.post(`/users/${tempPwdModal.user._id}/set-temp-password`, { tempPassword: tempPwdValue });
      message.success("Temporary password set and emailed");
      setTempPwdModal({ open: false, user: null });
      setTempPwdValue("");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to set temporary password";
      message.error(msg);
    } finally {
      setTempPwdSubmitting(false);
    }
  };

  const generateStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%^&*()-_=+[]{}";
    const all = upper + lower + digits + symbols;
    const pick = (s) => s[Math.floor(Math.random() * s.length)];
    const length = 12;
    // ensure at least one of each category
    let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
    for (let i = pwd.length; i < length; i++) pwd += pick(all);
    // shuffle
    pwd = pwd
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    setTempPwdValue(pwd);
  };

  const items = [
    {
      key: "ui",
      label: "UI",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Compact UI (reduce paddings/margins)"
            checked={settings.compactUI}
            onChange={(v) => {
              setSetting("compactUI", v);
              message.success("Compact UI setting updated");
            }}
          />
          <Divider style={{ margin: "8px 0" }} />
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ minWidth: 120 }}>Sider Background</span>
              <ColorPicker
                value={settings.siderBg}
                onChangeComplete={(c) => {
                  setSetting("siderBg", c.toHexString());
                  message.success("Sider color updated");
                }}
                format="hex"
                presets={[
                  { label: 'Blue', colors: ['#001529', '#002B5B', '#1677ff'] },
                  { label: 'Gray', colors: ['#141414', '#1f1f1f', '#2f2f2f'] },
                  { label: 'Green', colors: ['#0f3d3e', '#1b5e20', '#2e7d32'] },
                  { label: 'Purple', colors: ['#1f1646', '#2b1c6f', '#722ed1'] },
                ]}
              />
              <Space size={4} wrap>
                {[
                  '#001529', '#141414', '#2f2f2f', '#003a8c', '#391085', '#1b5e20'
                ].map((c) => (
                  <Button key={c} size="small" onClick={() => { setSetting('siderBg', c); message.success('Sider color updated'); }} style={{ background: c, color: '#fff', borderColor: '#0002' }}>
                    {" "}
                  </Button>
                ))}
              </Space>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ minWidth: 120 }}>Header Background</span>
              <ColorPicker
                value={settings.headerBg}
                onChangeComplete={(c) => {
                  setSetting("headerBg", c.toHexString());
                  message.success("Header color updated");
                }}
                format="hex"
                presets={[
                  { label: 'Light', colors: ['#ffffff', '#fafafa', '#f5f5f5'] },
                  { label: 'Dark', colors: ['#141414', '#1f1f1f', '#262626'] },
                  { label: 'Brand', colors: ['#1677ff', '#fa8c16', '#eb2f96'] },
                ]}
              />
              <Space size={4} wrap>
                {[
                  '#ffffff', '#141414', '#1677ff', '#fa8c16', '#eb2f96', '#262626'
                ].map((c) => (
                  <Button key={c} size="small" onClick={() => { setSetting('headerBg', c); message.success('Header color updated'); }} style={{ background: c, color: '#000', borderColor: '#0002' }}>
                    {" "}
                  </Button>
                ))}
              </Space>
            </div>
          </div>
        </Space>
      ),
    },
    userHierarchyPanel,
    ChangePasswordPanel,
    {
      key: "security",
      label: "Security & Privacy",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Mask Usernames (non-developers)"
            checked={settings.maskUsernames}
            onChange={(v) => setSetting("maskUsernames", v)}
          />
        </Space>
      ),
    },
    {
      key: "diagnostics",
      label: "Diagnostics",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Show Debug Info (env, versions)"
            checked={settings.showDebugInfo}
            onChange={(v) => setSetting("showDebugInfo", v)}
          />
          {settings.showDebugInfo && (
            <Alert
              showIcon
              type="info"
              message="Debug Info"
              description={
                <div style={{ fontFamily: "monospace" }}>
                  <div>Vite: {import.meta.env.MODE}</div>
                  <div>API: {import.meta.env.VITE_API_URL}</div>
                  <div>UserAgent: {navigator.userAgent}</div>
                </div>
              }
            />
          )}
        </Space>
      ),
    },
    {
      key: "api",
      label: "API & Logging",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Enable API Logging (console)"
            checked={settings.apiLogging}
            onChange={(v) => setSetting("apiLogging", v)}
          />
        </Space>
      ),
    },
    {
      key: "loans",
      label: "Loans",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Show Status Summary column"
            checked={settings.showStatusSummary}
            onChange={(v) => setSetting("showStatusSummary", v)}
          />
          <SettingRow
            label="Check Collections status per loan"
            checked={settings.enableCollectionStatusCheck}
            onChange={(v) => setSetting("enableCollectionStatusCheck", v)}
          />
        </Space>
      ),
    },
    {
      key: "collections",
      label: "Collections",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Dedupe on fetch"
            checked={settings.collectionsDedupeOnFetch}
            onChange={(v) => setSetting("collectionsDedupeOnFetch", v)}
          />
          <SettingRow
            label="Show import/upload actions"
            checked={settings.collectionsShowImportActions}
            onChange={(v) => setSetting("collectionsShowImportActions", v)}
          />
        </Space>
      ),
    },
    {
      key: "users",
      label: "Users",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Allow delete user (UI)"
            checked={settings.allowUserDelete}
            onChange={(v) => setSetting("allowUserDelete", v)}
          />
        </Space>
      ),
    },
    {
      key: "danger",
      label: "Danger Zone",
      children: (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text type="secondary">Reset all developer settings</Text>
          <Button danger type="primary" onClick={resetSettings} size="small">
            Reset
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="dev-settings" style={{ padding: 12, paddingTop: 8 }}>
      <Title level={3} style={{ marginTop: -6 }}>Developer Settings</Title>
      <Text type="secondary">
        Tools and switches for developers. Use responsibly.
      </Text>
      <Divider />
      <Collapse
        items={items}
        defaultActiveKey={["ui", "user-hierarchy", "change-password", "loans"]}
        accordion={false}
        size="small"
        style={{ background: "transparent" }}
      />
      <Modal
        title={`Set Temporary Password${tempPwdModal.user ? ` — ${tempPwdModal.user.FullName || tempPwdModal.user.Username}` : ""}`}
        open={tempPwdModal.open}
        onCancel={() => setTempPwdModal({ open: false, user: null })}
        onOk={submitTempPwd}
        okText="Set & Email"
        confirmLoading={tempPwdSubmitting}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input.Password
              placeholder="Temporary password"
              value={tempPwdValue}
              onChange={(e) => setTempPwdValue(e.target.value)}
              disabled={tempPwdSubmitting}
            />
            <Button onClick={generateStrongPassword} disabled={tempPwdSubmitting}>Generate</Button>
          </Space.Compact>
          <Text type="secondary">This will immediately set the user's password and email them the temporary password. Ask the user to change it after login.</Text>
        </Space>
      </Modal>
    </div>
  );
}
