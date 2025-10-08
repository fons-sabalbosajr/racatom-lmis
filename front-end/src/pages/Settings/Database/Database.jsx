import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Divider, Input, Modal, Row, Select, Space, Tag, message } from "antd";
import { ExclamationCircleOutlined, DatabaseOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
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

  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState();
  const [exportFormat, setExportFormat] = useState("json");

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
  }, []);

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

  return (
    <div className="db-settings">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={<Space><DatabaseOutlined />Database</Space>}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card size="small" bordered>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Space align="center">
                      <Tag color={health?.state === 1 ? "green" : "orange"}>
                        {loadingHealth ? "Checking..." : health?.state === 1 ? "Connected" : "Not connected"}
                      </Tag>
                      {health?.db && <Tag color="blue">{health.db}</Tag>}
                      <Button icon={<ReloadOutlined />} onClick={fetchHealth} loading={loadingHealth}>
                        Refresh
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
                        const modal = Modal.confirm({
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
                    </Space>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" bordered title="Danger zone" styles={{ header: { color: "#c0392b" } }}>
                  <Alert type="warning" showIcon message="Be careful—these actions delete data." style={{ marginBottom: 8 }} />
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
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
                      <Button danger icon={<DeleteOutlined />} onClick={runPurgeCollection} loading={purgeColLoading}>
                        Purge Collection
                      </Button>
                      <Button danger type="primary" onClick={runPurgeDb} loading={purgeDbLoading}>
                        Purge Entire Database
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Database;