import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Button,
  Badge,
  Card,
  Typography,
  Dropdown,
  List,
  Collapse,
  Popover,
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  FundViewOutlined, // ✅ Peso replacement
  CalendarOutlined,
  MessageOutlined, // ✅ Message icon
  CodeOutlined,
} from "@ant-design/icons";
import { lsGet, lsClearAllApp } from "../../utils/storage";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./home.css";
import logo from "../../assets/lmis.svg"; // your logo
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api from "../../utils/axios";
import { useDevSettings } from "../../context/DevSettingsContext";
// Tooltip no longer used

dayjs.extend(relativeTime);

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { Panel } = Collapse;

function Home() {
  const { settings, setSetting } = useDevSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(() => lsGet("user"));

  const [notifications, setNotifications] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch announcements (Simplified logic)
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get(
          `${import.meta.env.VITE_API_URL}/announcements`,
          {
            withCredentials: true,
          }
        );
        // Directly set the state with the data from the API
        setNotifications(res.data.announcements || []);
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark a single announcement as read (Simplified logic)
  const handleMarkAsRead = async (announcementId, link) => {
    try {
      // Optimistically update the UI
      setNotifications((prev) =>
        prev.map((n) => (n._id === announcementId ? { ...n, isRead: true } : n))
      );
      navigate(link);

      // Send request to the backend
      await api.post(
        `${
          import.meta.env.VITE_API_URL
        }/announcements/${announcementId}/mark-as-read`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Failed to mark announcement as read:", err);
    }
  };

  // Mark all as read (Simplified logic)
  const handleMarkAllAsRead = async () => {
    try {
      // Optimistically update the UI
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      // Send request to the backend
      await api.post(
        `${import.meta.env.VITE_API_URL}/announcements/mark-all-as-read`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Failed to mark all announcements as read:", err);
    }
  };


  // Logout
  const handleLogout = async () => {
    try {
      // Call backend to invalidate session/cookie
      await api.post(
        `${import.meta.env.VITE_API_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );

  // Clear all relevant localStorage keys
  lsClearAllApp();
      setUser(null); // clear user state in frontend
      setNotifications([]); // clear notifications state

      // Redirect to login
      window.location.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Avatar source
  const avatarSrc = (() => {
    if (!user?.Photo) return null;
    if (typeof user.Photo === "string") {
      if (user.Photo.startsWith("http") || user.Photo.startsWith("https"))
        return user.Photo;
      return `data:image/png;base64,${user.Photo}`;
    }
    if (user.Photo.data) {
      const base64 = btoa(
        new Uint8Array(user.Photo.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      return `data:image/png;base64,${base64}`;
    }
    return null;
  })();

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: (
        <div>
          <Text strong>{user?.FullName || "User"}</Text>
          <br />
          <Text type="secondary">{user?.Position || ""}</Text>
        </div>
      ),
      disabled: true, // make it informational only
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  // derive styles from settings (no global dark/light switch; use color picks only)
  const siderBg = settings.siderBg || "#001529";
  const headerBg = settings.headerBg || "#ffffff";
  const whiteOrBlack = (hex) => {
    try {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      // luminance
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 180 ? "#000" : "#fff";
    } catch {
      return "#000";
    }
  };
  const siderText = whiteOrBlack(siderBg);
  const headerText = whiteOrBlack(headerBg);
  const menuTheme = siderText === "#fff" ? "dark" : "light";

  // util: lighten/darken by mixing with white/black
  const mix = (hex, amt, toWhite = false) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const t = toWhite ? 255 : 0;
    const nr = Math.round(r + (t - r) * amt);
    const ng = Math.round(g + (t - g) * amt);
    const nb = Math.round(b + (t - b) * amt);
    const toHex = (n) => n.toString(16).padStart(2, "0");
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
  };
  const darken = (hex, amt) => mix(hex, amt, false);
  const lighten = (hex, amt) => mix(hex, amt, true);

  // derive variants for submenus and trigger (fixed mix amounts)
  const siderSubBg = darken(siderBg, 0.12);
  const siderSelectedBg = lighten(siderBg, 0.14);
  const siderToggleBg = lighten(siderBg, 0.10);

  return (
    <Layout className={`home-layout ${settings.compactUI ? "compact-ui" : ""}`}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
  theme={menuTheme}
        style={{
          background: siderBg,
          "--sider-bg": siderBg,
          "--sider-sub-bg": siderSubBg,
          "--sider-selected-bg": siderSelectedBg,
          "--sider-text": siderText,
          "--sider-toggle-bg": siderToggleBg,
        }}
      >
        <div
          className="home-logo"
          style={{
            color: siderText,
            textAlign: "center",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <img src={logo} alt="RCT LMS" style={{ width: 32, height: 32 }} />
          {!collapsed && <span style={{ fontSize: "13px" }}>RACATOM-LMIS</span>}
        </div>
        {(() => {
          const settingsChildren = [
            { key: "/settings/loan-rates", label: "Loan Rates Config" },
            { key: "/settings/employees", label: "Employee Accounts" },
            { key: "/settings/collectors", label: "Collector Accounts" },
            { key: "/settings/database", label: "Database" },
            { key: "/settings/announcements", label: "Announcements" },
            { key: "/settings/accounting", label: "Accounting Center" },
          ];
          if (user?.Position === "Developer") {
            settingsChildren.push({
              key: "/settings/developer",
              label: "Developer Settings",
              icon: <CodeOutlined />,
            });
          }

          const menuItems = [
            {
              key: "/dashboard",
              label: "Dashboard",
              icon: <DashboardOutlined />,
            },
            { key: "/loans", label: "Loans", icon: <FundViewOutlined /> },
            {
              key: "/reports",
              label: "Reports",
              icon: <FileTextOutlined />,
              children: [
                {
                  key: "/reports/statement-of-accounts",
                  label: "Statement of Accounts",
                },
                { key: "/reports/collections-list", label: "Collections List" },
                { key: "/reports/account-vouchers", label: "Account Vouchers" },
              ],
            },
            {
              key: "/settings",
              label: "Settings",
              icon: <SettingOutlined />,
              children: settingsChildren,
            },
          ];

          return (
            <Menu
              theme={menuTheme}
              mode="inline"
              selectedKeys={[location.pathname]}
              onClick={({ key }) => navigate(key)}
              items={menuItems}
              style={{ background: siderBg, color: siderText }}
            />
          );
        })()}
      </Sider>

      <Layout>
        <Header
          className="home-header"
          style={{
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: headerBg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* ✅ Date/Time */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: headerText,
                fontWeight: "bold",
                fontSize: "0.9rem",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              <CalendarOutlined />
              <span>
                {currentTime.toLocaleString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </span>
              <span>
                {currentTime.toLocaleString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>

            {/* ✅ Messages Popover */}
            <Popover
              placement="bottomRight"
              title="Messages"
              trigger="click"
              content={
                <List
                  size="small"
                  dataSource={[
                    { text: "New loan request pending", link: "/loans" },
                    {
                      text: "Reminder: Update employee info",
                      link: "/settings/employees",
                    },
                  ]}
                  renderItem={(item) => (
                    <List.Item
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        navigate(item.link);
                      }}
                    >
                      {item.text}
                    </List.Item>
                  )}
                />
              }
            >
              <Badge count={2} size="small">
                <MessageOutlined
                  style={{
                    fontSize: "18px",
                    color: headerText,
                    cursor: "pointer",
                  }}
                />
              </Badge>
            </Popover>

            {/* ✅ Notifications Popover */}
            <Popover
              placement="bottomRight"
              trigger="click"
              overlayClassName="notif-popover"
              content={
                <div>
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 12px",
                      borderBottom: "1px solid #f0f0f0",
                      fontWeight: 600,
                    }}
                  >
                    <span>Notifications</span>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  </div>

                  {/* List */}
                  <List
                    className="notif-list"
                    itemLayout="horizontal"
                    dataSource={notifications
                      .filter((n) => {
                        const expired =
                          n.ExpirationDate &&
                          dayjs().isAfter(dayjs(n.ExpirationDate));
                        return n.isActive && !expired;
                      })
                      .map((n) => ({
                        key: n._id,
                        title: n.Title || "Untitled announcement",
                        content: n.Content || "",
                        time: n.PostedDate
                          ? dayjs(n.PostedDate).fromNow()
                          : "Just now",
                        link: `/settings/announcements/${n._id}`,
                        isRead: n.isRead, // Use isRead from API
                      }))}
                    locale={{ emptyText: "No notifications" }}
                    renderItem={(item) => (
                      <List.Item
                        key={item.key}
                        className={item.isRead ? "notif-read" : "notif-unread"}
                        style={{
                          cursor: "pointer",
                          padding: "10px 12px",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                        onClick={() => handleMarkAsRead(item.key, item.link)}
                      >
                        <List.Item.Meta
                          title={
                            <div
                              style={{
                                fontWeight: item.isRead ? 500 : 600,
                                fontSize: "14px",
                                color: item.isRead ? "#888" : "#000",
                              }}
                            >
                              {item.title}
                            </div>
                          }
                          description={
                            <div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: item.isRead ? "#aaa" : "#444",
                                  marginBottom: "4px",
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {item.content}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#999",
                                }}
                              >
                                {item.time}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              }
            >
              <Badge
                count={notifications.filter((n) => !n.isRead).length} // Count only unread items
                size="small"
              >
                <BellOutlined
                  style={{
                    fontSize: "18px",
                    color: headerText,
                    cursor: "pointer",
                  }}
                />
              </Badge>
            </Popover>

            {/* Theme toggle removed; color is controlled via Developer Settings */}

            {/* ✅ User Avatar Dropdown */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Avatar
                src={avatarSrc}
                icon={!avatarSrc && <UserOutlined />}
                style={{ cursor: "pointer" }}
              />
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="home-content" style={{ margin: "16px" }}>
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer className="home-footer">
          © {new Date().getFullYear()} RACATOM Corp. Loan Management System
        </Footer>
      </Layout>
    </Layout>
  );
}

export default Home;