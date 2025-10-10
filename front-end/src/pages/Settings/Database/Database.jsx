import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Divider, Input, Modal, Row, Select, Space, Tag, message, Tabs, Table, Typography, Switch } from "antd";
import { ExclamationCircleOutlined, DatabaseOutlined, DeleteOutlined, ReloadOutlined, SafetyOutlined, DisconnectOutlined, LinkOutlined } from "@ant-design/icons";
import api from "../../../utils/axios";
import { saveAs } from "file-saver";
import "./database.css";

const { confirm } = Modal;

const Database = () => {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [compactLoading, setCompactLoading] = useState(false);
  const [purgeDbLoading, setPurgeDbLoading] = useState(false);
  const [purgeColLoading, setPurgeColLoading] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [connState, setConnState] = useState(null);

  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState();
  const [exportFormat, setExportFormat] = useState("json");

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsQuery, setAccountsQuery] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // Maintenance state
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const apiBase = useMemo(() => "database", []);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
  const { data } = await api.get(`/${apiBase}/health`);
      if (data.success) setHealth(data);
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to fetch DB health");
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchCollections = async () => {
    setCollectionsLoading(true);
    try {
  const { data } = await api.get(`/${apiBase}/collections`);
      if (data.success) setCollections(data.collections || []);
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to load collections");
    } finally {
      setCollectionsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchCollections();
    fetchConnectionState();
    fetchAccounts();
    fetchMaintenance();
  }, []);

  const fetchConnectionState = async () => {
    setConnLoading(true);
    try {
      const { data } = await api.get(`/${apiBase}/connection/state`);
      if (data.success) setConnState(data.state);
    } catch (e) {
      // ignore
    } finally {
      setConnLoading(false);
    }
  };

  const toggleConnection = async (shouldConnect) => {
    setConnLoading(true);
    try {
      const url = shouldConnect ? "connect" : "disconnect";
      const { data } = await api.post(`/${apiBase}/connection/${url}`);
      if (data.success) {
        message.success(shouldConnect ? "Connected" : "Disconnected");
        await fetchHealth();
        await fetchConnectionState();
      } else {
        message.error(data.message || "Operation failed");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Operation failed");
    } finally {
      setConnLoading(false);
    }
  };

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const { data } = await api.get(`/${apiBase}/accounts`, { params: { q: accountsQuery || undefined } });
      if (data.success) setAccounts(data.accounts || []);
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  };

  const deleteAccountCascade = async (accountId) => {
    confirm({
      title: `Delete ALL data for Account ${accountId}?`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>This will permanently delete the account and all related records:</p>
          <ul>
            <li>LoanClient</li>
            <li>LoanCycle</li>
            <li>LoanCollection</li>
            <li>LoanDocument</li>
            <li>LoanDisbursed</li>
            <li>LoanClientApplication</li>
          </ul>
          <Alert type="error" message="This action cannot be undone." showIcon />
        </div>
      ),
      okText: "Yes, delete everything",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setDeleteLoadingId(accountId);
        try {
          const { data } = await api.delete(`/${apiBase}/account/${accountId}`);
          if (data.success) {
            message.success(`Deleted ${data.totalDeleted} related docs.`);
            fetchAccounts();
          } else {
            message.error(data.message || "Delete failed");
          }
        } catch (e) {
          message.error(e.response?.data?.message || "Delete failed");
        } finally {
          setDeleteLoadingId(null);
        }
      },
    });
  };

  const fetchMaintenance = async () => {
    try {
      const { data } = await api.get(`/${apiBase}/maintenance`);
      if (data.success) setMaintenance(!!data.maintenance);
    } catch (e) {}
  };

  const setMaintenanceMode = async (val) => {
    setMaintenanceLoading(true);
    try {
      const { data } = await api.post(`/${apiBase}/maintenance`, { maintenance: !!val });
      if (data.success) {
        setMaintenance(!!data.maintenance);
        message.success(`Maintenance ${val ? "enabled" : "disabled"}`);
      } else {
        message.error(data.message || "Failed to update maintenance mode");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to update maintenance mode");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const exportCollection = async () => {
    if (!selectedCollection) return message.warning("Select a collection first");
    setExportLoading(true);
    try {
      const resp = await api.get(`/${apiBase}/export`, {
        params: { collection: selectedCollection, format: exportFormat },
        responseType: "blob",
      });
      const blob = resp.data;
      const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
      const filename = `${selectedCollection}_${stamp}.${exportFormat}`;
      saveAs(blob, filename);
      message.success("Export started");
    } catch (e) {
      message.error(e.response?.data?.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const runRestore = async (sourceDir) => {
    setRestoreLoading(true);
    try {
  const { data } = await api.post(`/${apiBase}/restore`, { sourceDir });
      if (data.success) {
        message.success("Restore completed");
        fetchHealth();
      } else {
        message.error(data.message || "Restore failed");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Restore failed");
    } finally {
      setRestoreLoading(false);
    }
  };

  const runCompact = async () => {
    setCompactLoading(true);
    try {
  const { data } = await api.post(`/${apiBase}/compact`);
      if (data.success) message.success("Maintenance successful");
      else message.error(data.message || "Maintenance failed");
    } catch (e) {
      message.error(e.response?.data?.message || "Maintenance failed");
    } finally {
      setCompactLoading(false);
    }
  };

  const runPurgeCollection = async () => {
    if (!selectedCollection) return message.warning("Select a collection first");
    confirm({
      title: `Delete all documents in ${selectedCollection}?`,
      icon: <ExclamationCircleOutlined />,
      content: "This action cannot be undone.",
      okText: "Yes, purge",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setPurgeColLoading(true);
        try {
          const { data } = await api.post(`/${apiBase}/purge-collection`, { collectionName: selectedCollection });
          if (data.success) message.success(`Deleted ${data.deletedCount} docs in ${selectedCollection}`);
          else message.error(data.message || "Purge failed");
        } catch (e) {
          message.error(e.response?.data?.message || "Purge failed");
        } finally {
          setPurgeColLoading(false);
        }
      },
    });
  };

  const runPurgeDb = async () => {
    confirm({
      title: "Delete ALL documents in the database?",
      icon: <ExclamationCircleOutlined />,
      content: "This will empty every collection. It cannot be undone.",
      okText: "Yes, purge all",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setPurgeDbLoading(true);
        try {
          const { data } = await api.delete(`/${apiBase}/purge-db`);
          if (data.success) message.success(`Purged database. Total deleted: ${data.totalDeleted}`);
          else message.error(data.message || "Purge failed");
        } catch (e) {
          message.error(e.response?.data?.message || "Purge failed");
        } finally {
          setPurgeDbLoading(false);
        }
      },
    });
  };

  const accountsColumns = [
    { title: "AccountId", dataIndex: "AccountId", key: "AccountId" },
    { title: "ClientNo", dataIndex: "ClientNo", key: "ClientNo" },
    { title: "Name", key: "name", render: (_, r) => `${r.FirstName || ""} ${r.MiddleName || ""} ${r.LastName || ""}`.replace(/\s+/g, " ").trim() },
    { title: "Location", key: "loc", render: (_, r) => [r.Barangay, r.City, r.Province].filter(Boolean).join(", ") },
    { title: "Updated", dataIndex: "updatedAt", key: "updatedAt", render: (v) => v ? new Date(v).toLocaleString() : "" },
    { title: "Actions", key: "actions", render: (_, r) => (
      <Button danger icon={<DeleteOutlined />} onClick={() => deleteAccountCascade(r.AccountId)} loading={deleteLoadingId === r.AccountId}>
        Delete
      </Button>
    ) },
  ];

  return (
    <div className="db-settings">
      <Card title={<Space><DatabaseOutlined />Database Tools</Space>}>
        <Tabs
          defaultActiveKey="accounts"
          items={[
            {
              key: "accounts",
              label: "Loan Accounts",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                  <Alert type="warning" showIcon message="Caution: Deleting an account cascades to all related data." />
                  <Row gutter={[8, 8]}>
                    <Col flex="auto">
                      <Input.Search
                        placeholder="Search by AccountId, ClientNo, or Name"
                        allowClear
                        enterButton
                        value={accountsQuery}
                        onChange={(e) => setAccountsQuery(e.target.value)}
                        onSearch={fetchAccounts}
                      />
                    </Col>
                    <Col>
                      <Button onClick={fetchAccounts} loading={accountsLoading} icon={<ReloadOutlined />}>Refresh</Button>
                    </Col>
                  </Row>
                  <Table
                    size="small"
                    rowKey={(r) => r._id || r.AccountId}
                    loading={accountsLoading}
                    dataSource={accounts}
                    columns={accountsColumns}
                    pagination={{ pageSize: 10 }}
                  />
                </Space>
              ),
            },
            {
              key: "connection",
              label: "Database Connection",
              children: (
                <>
                  <Space align="center" style={{ marginBottom: 12 }}>
                    <Tag color={health?.state === 1 ? "green" : "orange"}>
                      {loadingHealth ? "Checking..." : health?.state === 1 ? "Connected" : "Not connected"}
                    </Tag>
                    {health?.db && <Tag color="blue">{health.db}</Tag>}
                    <Button icon={<ReloadOutlined />} onClick={() => { fetchHealth(); fetchConnectionState(); }} loading={loadingHealth || connLoading}>
                      Refresh
                    </Button>
                    <Button icon={<DisconnectOutlined />} onClick={() => toggleConnection(false)} loading={connLoading} disabled={connState === 0}>
                      Disconnect
                    </Button>
                    <Button type="primary" icon={<LinkOutlined />} onClick={() => toggleConnection(true)} loading={connLoading}>
                      Connect
                    </Button>
                  </Space>
                  <Divider style={{ margin: "8px 0" }} />
                  <Space wrap>
                    <Select
                      style={{ minWidth: 220 }}
                      placeholder={collectionsLoading ? "Loading collections..." : "Select collection"}
                      loading={collectionsLoading}
                      value={selectedCollection}
                      onChange={setSelectedCollection}
                      options={collections.map((c) => ({ label: c, value: c }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    <Select
                      style={{ minWidth: 140 }}
                      value={exportFormat}
                      onChange={setExportFormat}
                      options={[{ label: "JSON", value: "json" }, { label: "CSV", value: "csv" }]}
                    />
                    <Button type="primary" onClick={exportCollection} loading={exportLoading}>
                      Export Collection
                    </Button>
                    <Button onClick={() => {
                      let inputVal = "";
                      Modal.confirm({
                        title: "Restore from backup directory",
                        content: (
                          <Input placeholder="Absolute path on server (e.g., /app/backups/db_2024-10-01_1200)"
                                 onChange={(e) => { inputVal = e.target.value; }} />
                        ),
                        okText: "Restore",
                        onOk: () => inputVal ? runRestore(inputVal) : message.warning("Please provide a directory path"),
                      });
                    }} loading={restoreLoading}>
                      Restore From Directory
                    </Button>
                    <Button onClick={runCompact} loading={compactLoading}>
                      Run Maintenance
                    </Button>
                    <Button danger icon={<DeleteOutlined />} onClick={runPurgeCollection} loading={purgeColLoading}>
                      Purge Collection
                    </Button>
                    <Button danger type="primary" onClick={runPurgeDb} loading={purgeDbLoading}>
                      Purge Entire Database
                    </Button>
                  </Space>
                </>
              ),
            },
            {
              key: "maintenance",
              label: "Maintenance Activation",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                  <Alert
                    type="info"
                    showIcon
                    message="Maintenance mode blocks access for non-developers so you can debug/update safely."
                  />
                  <Space align="center">
                    <Switch checked={maintenance} onChange={setMaintenanceMode} loading={maintenanceLoading} />
                    <Typography.Text>{maintenance ? "Enabled" : "Disabled"}</Typography.Text>
                  </Space>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Database;