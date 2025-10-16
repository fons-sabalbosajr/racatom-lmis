import React, { useEffect, useState } from "react";
import { Typography, Divider, Switch, Space, Alert, Collapse, Button, Table, Select, message, Spin, Form, Input, Modal, ColorPicker, Radio, Card, Checkbox } from "antd";
import { useDevSettings } from "../../../context/DevSettingsContext";
import api from "../../../utils/axios";
import "./devsettings.css";

const { Title, Text } = Typography;

export default function DeveloperSettings() {
  const { settings, setSetting, resetSettings } = useDevSettings();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [applyingAutomation, setApplyingAutomation] = useState(false);
  const [tempPwdModal, setTempPwdModal] = useState({ open: false, user: null });
  const [tempPwdValue, setTempPwdValue] = useState("");
  const [sendingReset, setSendingReset] = useState({}); // { [userId]: boolean }
  const [verifying, setVerifying] = useState({}); // { [userId]: boolean }
  const [positionUpdating, setPositionUpdating] = useState({}); // { [userId]: boolean }
  const [tempPwdSubmitting, setTempPwdSubmitting] = useState(false);
  const [permModal, setPermModal] = useState({ open: false, user: null });
  const [permState, setPermState] = useState(null);

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
                    <Button size="small" onClick={() => openPermissionsModal(record)}>Manage Access</Button>
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

  const openPermissionsModal = (user) => {
    // initialize state from user.permissions or defaults
    const defaults = {
      menus: {
        dashboard: true,
        loans: true,
        reports: true,
        settings: true,
        settingsDatabase: false,
        settingsEmployees: false,
        settingsCollectors: true,
        settingsAnnouncements: true,
        settingsAccounting: true,
        developerSettings: false,
      },
      actions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        loans: { canView: true, canEdit: false, canDelete: false },
        collections: { canView: true, canEdit: false, canDelete: false },
        reports: { canView: true, canEdit: false, canDelete: false },
        users: { canView: false, canEdit: false, canDelete: false },
      },
    };
    // Deep-merge defaults with existing permissions so all expected keys (like Employee Accounts, Announcements) are present
    const mergePerms = (base, extra) => ({
      menus: { ...base.menus, ...(extra?.menus || {}) },
      actions: {
        ...base.actions,
        ...(extra?.actions || {}),
        loans: { ...base.actions.loans, ...(extra?.actions?.loans || {}) },
        collections: { ...base.actions.collections, ...(extra?.actions?.collections || {}) },
        reports: { ...base.actions.reports, ...(extra?.actions?.reports || {}) },
        users: { ...base.actions.users, ...(extra?.actions?.users || {}) },
      },
    });
    const existing = (user.permissions && Object.keys(user.permissions).length) ? user.permissions : null;
    const p = mergePerms(defaults, existing);
    setPermState(JSON.parse(JSON.stringify(p)));
    setPermModal({ open: true, user });
  };

  const savePermissions = async () => {
    try {
      if (!permModal.user || !permState) return;
      await api.put(`/users/${permModal.user._id}`, { permissions: permState });
      message.success("Permissions updated");
      setPermModal({ open: false, user: null });
      setPermState(null);
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update permissions";
      message.error(msg);
    }
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
            {/* Quick presets affecting both Header and Sider */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ minWidth: 120 }}>Theme Presets</span>
              <Space size={6} wrap>
                <Button size="small" onClick={async () => {
                  const preset = { headerBg: "#ffffff", siderBg: "#001529" };
                  setSetting("headerBg", preset.headerBg);
                  setSetting("siderBg", preset.siderBg);
                  try {
                    await api.put("/theme/me", preset);
                    message.success("Preset applied and saved (Light)");
                  } catch { message.error("Failed to save preset"); }
                }}>Light</Button>
                <Button size="small" onClick={async () => {
                  const preset = { headerBg: "#141414", siderBg: "#141414" };
                  setSetting("headerBg", preset.headerBg);
                  setSetting("siderBg", preset.siderBg);
                  try {
                    await api.put("/theme/me", preset);
                    message.success("Preset applied and saved (Dark)");
                  } catch { message.error("Failed to save preset"); }
                }}>Dark</Button>
                <Button size="small" onClick={async () => {
                  const preset = { headerBg: "#1677ff", siderBg: "#001529" };
                  setSetting("headerBg", preset.headerBg);
                  setSetting("siderBg", preset.siderBg);
                  try {
                    await api.put("/theme/me", preset);
                    message.success("Preset applied and saved (Brand)");
                  } catch { message.error("Failed to save preset"); }
                }}>Brand</Button>
              </Space>
              <Button size="small" type="primary" onClick={async () => {
                try {
                  await api.put("/theme/me", { headerBg: settings.headerBg, siderBg: settings.siderBg });
                  message.success("Theme saved (Header + Sider)");
                } catch {
                  message.error("Failed to save theme");
                }
              }}>Save Theme</Button>
            </div>
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
              <Button size="small" onClick={async () => {
                try {
                  await api.put("/theme/me", { siderBg: settings.siderBg });
                  message.success("Sider theme saved");
                } catch (e) {
                  message.error("Failed to save theme");
                }
              }}>Save</Button>
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
              <Button size="small" onClick={async () => {
                try {
                  await api.put("/theme/me", { headerBg: settings.headerBg });
                  message.success("Header theme saved");
                } catch (e) {
                  message.error("Failed to save theme");
                }
              }}>Save</Button>
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
      key: "tools",
      label: "Tools",
      children: (
        <PasswordGeneratorCard />
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
          <SettingRow
            label="Enable automated Loan Status (Status Summary)"
            checked={settings.autoLoanStatus}
            onChange={(v) => setSetting("autoLoanStatus", v)}
          />
          {settings.autoLoanStatus && (
            <Alert
              type="info"
              showIcon
              message="Automated Loan Status is activated"
              description="Configured grace periods below will take effect in the Status Summary column."
            />
          )}
          <Card size="small" title="Automated Status Grace Periods (days)">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Alert
                type="info"
                showIcon
                message="Editing grace periods"
                description="Updating these values changes how automated statuses are computed. Values save immediately. To write the resulting statuses to the backend (so filters use them), click Apply Now."
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Dormant (no collection for)</span>
                <Input
                  type="number"
                  min={1}
                  value={settings.autoLoanStatusGrace?.dormantDays ?? 365}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, dormantDays: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Litigation after maturity</span>
                <Input
                  type="number"
                  min={0}
                  value={settings.autoLoanStatusGrace?.litigationDaysAfterMaturity ?? 180}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, litigationDaysAfterMaturity: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Past Due after maturity</span>
                <Input
                  type="number"
                  min={0}
                  value={settings.autoLoanStatusGrace?.pastDueDaysAfterMaturity ?? 7}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, pastDueDaysAfterMaturity: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <Divider style={{ margin: "8px 0" }} />
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Arrears — Daily after</span>
                <Input
                  type="number"
                  min={0}
                  value={settings.autoLoanStatusGrace?.arrearsDailyDays ?? 3}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, arrearsDailyDays: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Arrears — Weekly after</span>
                <Input
                  type="number"
                  min={0}
                  value={settings.autoLoanStatusGrace?.arrearsWeeklyDays ?? 7}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, arrearsWeeklyDays: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Arrears — Semi-monthly after</span>
                <Input
                  type="number"
                  min={0}
                  value={settings.autoLoanStatusGrace?.arrearsSemiMonthlyDays ?? 15}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, arrearsSemiMonthlyDays: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ minWidth: 220 }}>Arrears — Monthly after</span>
                <Input
                  type="number"
                  min={0}
                  value={settings.autoLoanStatusGrace?.arrearsMonthlyDays ?? 30}
                  onChange={(e) => setSetting("autoLoanStatusGrace", { ...settings.autoLoanStatusGrace, arrearsMonthlyDays: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <Text type="secondary">Prompt: After changing grace periods, apply changes to backend to update Loan Status values for filtering.</Text>
                <Button
                  type="primary"
                  onClick={() => {
                    if (!settings.autoLoanStatus) {
                      message.info("Enable automated Loan Status first.");
                      return;
                    }
                    Modal.confirm({
                      title: "Apply automated statuses to backend?",
                      content:
                        "This will compute automated statuses using the configured grace periods and update Loan Status in the database (non-CLOSED only). Continue?",
                      okText: "Apply Now",
                      cancelText: "Cancel",
                      onOk: async () => {
                        try {
                          setApplyingAutomation(true);
                          const res = await api.post("/loans/apply-automated-statuses", {
                            thresholds: settings.autoLoanStatusGrace || {},
                          });
                          const info = res?.data?.data;
                          message.success(
                            info
                              ? `Applied automated statuses (computed: ${info.computed}, changed: ${info.changed}).`
                              : "Applied automated statuses."
                          );
                        } catch (err) {
                          const msg = err?.response?.data?.message || err?.message || "Failed to apply automated statuses";
                          message.error(msg);
                        } finally {
                          setApplyingAutomation(false);
                        }
                      },
                    });
                  }}
                  loading={applyingAutomation}
                >
                  Apply Now
                </Button>
              </div>
            </Space>
          </Card>
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
      key: "manage-access",
      label: "Manage Access (UI toggles)",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <SettingRow
            label="Show Settings / Employee Accounts"
            checked={settings.accessEmployees}
            onChange={(v) => setSetting("accessEmployees", v)}
          />
          <SettingRow
            label="Show Settings / Announcements"
            checked={settings.accessAnnouncements}
            onChange={(v) => setSetting("accessAnnouncements", v)}
          />
          <Alert
            type="info"
            showIcon
            message="These toggles affect UI visibility only"
            description="They hide or show the menu items locally. They do not change server-side permissions. Use Manage Access per user to control backend permissions."
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
        // collapse all panels by default
        defaultActiveKey={[]}
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
      <Modal
        title={`Manage Access${permModal.user ? ` — ${permModal.user.FullName || permModal.user.Username}` : ""}`}
        open={permModal.open}
        onCancel={() => { setPermModal({ open: false, user: null }); setPermState(null); }}
        onOk={savePermissions}
        okText="Save"
        width={720}
      >
        {permState ? (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Card size="small" title="Menu Access">
              {(() => {
                const menuLabels = {
                  dashboard: "Dashboard",
                  loans: "Loans",
                  reports: "Reports",
                  settings: "Settings (root)",
                  settingsDatabase: "Settings / Database",
                  settingsEmployees: "Settings / Employee Accounts",
                  settingsCollectors: "Settings / Collector Accounts",
                  settingsAnnouncements: "Settings / Announcements",
                  settingsAccounting: "Settings / Accounting Center",
                  developerSettings: "Developer Settings",
                };
                const order = [
                  "dashboard",
                  "loans",
                  "reports",
                  "settings",
                  "settingsEmployees",
                  "settingsCollectors",
                  "settingsAnnouncements",
                  "settingsAccounting",
                  "settingsDatabase",
                  "developerSettings",
                ];
                const keys = Array.from(new Set([...order, ...Object.keys(permState.menus || {})]));
                return (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {keys.map((k) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{menuLabels[k] || k}</span>
                        <Switch
                          checked={!!permState.menus[k]}
                          onChange={(val) => setPermState((prev) => ({ ...prev, menus: { ...prev.menus, [k]: val } }))}
                        />
                      </div>
                    ))}
                  </Space>
                );
              })()}
            </Card>
            <Card size="small" title="Global Actions">
              <Space>
                <Checkbox checked={!!permState.actions.canView} onChange={(e) => setPermState((p) => ({ ...p, actions: { ...p.actions, canView: e.target.checked } }))}>View</Checkbox>
                <Checkbox checked={!!permState.actions.canEdit} onChange={(e) => setPermState((p) => ({ ...p, actions: { ...p.actions, canEdit: e.target.checked } }))}>Edit</Checkbox>
                <Checkbox checked={!!permState.actions.canDelete} onChange={(e) => setPermState((p) => ({ ...p, actions: { ...p.actions, canDelete: e.target.checked } }))}>Delete</Checkbox>
              </Space>
            </Card>
            <Card size="small" title="Module Actions">
              {Object.keys(permState.actions).filter((k) => typeof permState.actions[k] === 'object').map((mod) => (
                <div key={mod} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <strong style={{ width: 120, textTransform: 'capitalize' }}>{mod}</strong>
                  <Space>
                    <Checkbox checked={!!permState.actions[mod].canView} onChange={(e) => setPermState((p) => ({ ...p, actions: { ...p.actions, [mod]: { ...p.actions[mod], canView: e.target.checked } } }))}>View</Checkbox>
                    <Checkbox checked={!!permState.actions[mod].canEdit} onChange={(e) => setPermState((p) => ({ ...p, actions: { ...p.actions, [mod]: { ...p.actions[mod], canEdit: e.target.checked } } }))}>Edit</Checkbox>
                    <Checkbox checked={!!permState.actions[mod].canDelete} onChange={(e) => setPermState((p) => ({ ...p, actions: { ...p.actions, [mod]: { ...p.actions[mod], canDelete: e.target.checked } } }))}>Delete</Checkbox>
                  </Space>
                </div>
              ))}
            </Card>
          </Space>
        ) : (
          <div>No permissions loaded.</div>
        )}
      </Modal>
    </div>
  );
}

function PasswordGeneratorCard() {
  const [genLength, setGenLength] = useState(12);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genOutput, setGenOutput] = useState("");
  return (
    <Card size="small" title="Password Generator">
      <Space direction="vertical" style={{ width: "100%" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ minWidth: 90 }}>Length:</span>
          <Input
            type="number"
            min={6}
            max={64}
            value={genLength}
            onChange={(e) => setGenLength(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ minWidth: 90 }}>Uppercase:</span>
          <Switch checked={genUpper} onChange={setGenUpper} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ minWidth: 90 }}>Lowercase:</span>
          <Switch checked={genLower} onChange={setGenLower} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ minWidth: 90 }}>Digits:</span>
          <Switch checked={genDigits} onChange={setGenDigits} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ minWidth: 90 }}>Symbols:</span>
          <Switch checked={genSymbols} onChange={setGenSymbols} />
        </div>
        <Space>
          <Button onClick={() => {
            const pools = [];
            if (genUpper) pools.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
            if (genLower) pools.push("abcdefghijkmnopqrstuvwxyz");
            if (genDigits) pools.push("23456789");
            if (genSymbols) pools.push("!@#$%^&*()-_=+[]{}");
            if (pools.length === 0) { message.error("Select at least one character set"); return; }
            const pick = (s) => s[Math.floor(Math.random() * s.length)];
            let pwd = pools.map(pick).join("");
            const all = pools.join("");
            for (let i = pwd.length; i < genLength; i++) pwd += pick(all);
            pwd = pwd.split("").sort(() => Math.random() - 0.5).join("");
            setGenOutput(pwd);
          }}>Generate</Button>
          <Button onClick={() => { navigator.clipboard.writeText(genOutput || ""); message.success("Copied to clipboard"); }} disabled={!genOutput}>Copy</Button>
        </Space>
        <Input.TextArea rows={3} value={genOutput} readOnly placeholder="Generated password will appear here" />
      </Space>
    </Card>
  );
}
