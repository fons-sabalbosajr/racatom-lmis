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
import { lsGet, lsGetSession, lsClearAllApp } from "../../utils/storage";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./home.css";
import logo from "../../assets/lmis.svg"; // your logo
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api, { setRuntimeToken } from "../../utils/axios";
import { useDevSettings } from "../../context/DevSettingsContext";
// Tooltip no longer used

dayjs.extend(relativeTime);

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { Panel } = Collapse;

function Home() {
  const { settings, setSetting } = useDevSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(() => lsGetSession("user") || lsGet("user"));

  const [notifications, setNotifications] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Sider width remains fixed (non-compact) on tablet screens per request

  // Ensure user info (name/photo) reflects the active session
  useEffect(() => {
    const syncUser = async () => {
      try {
        const res = await api.get(`/auth/me`);
        const fetched = res?.data?.data?.user;
        if (fetched) {
          setUser(fetched);
          // keep storage in sync scoped to this tab/window
          try {
            const { lsSetSession } = await import("../../utils/storage");
            lsSetSession("user", fetched);
          } catch {}
          // dev auth banner removed
        }
      } catch (e) {
        // handled globally (401 redirects); swallow here
      }
    };

    // Always attempt to sync on mount; cheap and keeps UI accurate on refresh
    syncUser();
  }, []);

  // Fetch announcements (Simplified logic)
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get(`/announcements`);
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

      // Determine if current user is a developer (only devs navigate)
      const perms = user?.permissions?.menus || {};
      const isDev = (() => {
        const pos = String(user?.Position || "").toLowerCase();
        if (pos === "developer") return true;
        return !!(
          perms.developerSettings ||
          perms.settingsDatabase ||
          perms.admin
        );
      })();

      // Only developers navigate to the announcement details (and only if visible in UI settings)
      if (isDev && settings.accessAnnouncements !== false && link) {
        navigate(link);
      }

      // Send request to the backend
      await api.post(`/announcements/${announcementId}/mark-as-read`, {});
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
      await api.post(`/announcements/mark-all-as-read`, {});
    } catch (err) {
      console.error("Failed to mark all announcements as read:", err);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      // Call backend to invalidate session/cookie
      await api.post(`/auth/logout`, {});

      // Clear all relevant local/session storage keys
      lsClearAllApp();
      // Also clear the encrypted session-scoped token for this tab/window
      try {
        const { lsRemove } = await import("../../utils/storage");
        lsRemove("token");
        // remove any legacy keys that might have been set by older code
        try {
          sessionStorage.removeItem("__session_token");
        } catch {}
        try {
          localStorage.removeItem("rct-lmis:user");
        } catch {}
      } catch {}
      // Clear axios runtime Authorization header
      try { setRuntimeToken(null); } catch {}
      setUser(null); // clear user state in frontend
      setNotifications([]); // clear notifications state
      // Smooth client-side navigation to login (no hard reload needed)
      navigate("/login", { replace: true });
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

  // Initials fallback for avatar
  const avatarInitials = (() => {
    const src = (user?.FullName || user?.Username || "").trim();
    if (!src) return "";
    const parts = src.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  })();

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: (
        <div>
          <Text strong>{user?.FullName || user?.Username || "User"}</Text>
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
  const siderToggleBg = lighten(siderBg, 0.1);

  return (
    <Layout
      className={`home-layout ${collapsed ? "collapsed" : ""} ${
        settings.compactUI ? "compact-ui" : ""
      }`}
      style={{
        // expose the sider width at a parent level so sibling content can offset itself
        "--sider-width": collapsed ? "80px" : "200px",
        "--sider-collapsed-width": "80px",
      }}
    >
      {/* dev auth banner removed */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
  width={200}
        collapsedWidth={80}
        theme={menuTheme}
        style={{
          position: "fixed",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          zIndex: 101,
          overflow: "auto",
          background: siderBg,
          // expose the actual sider width to CSS so the spacer always matches
          "--sider-width": collapsed ? "80px" : "200px",
          "--sider-collapsed-width": "80px",
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
          const perms = user?.permissions?.menus || {};
          // Robust developer detection: normalize case and allow permission flags
          const isDev = (() => {
            const pos = String(user?.Position || "").toLowerCase();
            if (pos === "developer") return true;
            return !!(
              perms.developerSettings ||
              perms.settingsDatabase ||
              perms.admin
            );
          })();
          const settingsChildren = [
            ...((perms.settingsEmployees === false && !isDev) ||
            settings.accessEmployees === false
              ? []
              : [{ key: "/settings/employees", label: "Employee Accounts" }]),
            ...(perms.settingsCollectors === false && !isDev
              ? []
              : [{ key: "/settings/collectors", label: "Collector Accounts" }]),
            ...(perms.settingsDatabase === false && !isDev
              ? []
              : [{ key: "/settings/database", label: "Database" }]),
            ...((perms.settingsAnnouncements === false && !isDev) ||
            settings.accessAnnouncements === false
              ? []
              : [{ key: "/settings/announcements", label: "Announcements" }]),
            ...(perms.settingsAccounting === false && !isDev
              ? []
              : [{ key: "/settings/accounting", label: "Accounting Center" }]),
            { key: "/settings/loan-rates", label: "Loan Rates Config" },
          ];
          if (isDev || perms.developerSettings) {
            settingsChildren.push({
              key: "/settings/developer",
              label: "Developer Settings",
              icon: <CodeOutlined />,
            });
          }

          const menuItems = [
            ...(perms.dashboard === false && !isDev
              ? []
              : [
                  {
                    key: "/dashboard",
                    label: "Dashboard",
                    icon: <DashboardOutlined />,
                  },
                ]),
            ...(perms.loans === false && !isDev
              ? []
              : [
                  { key: "/loans", label: "Loans", icon: <FundViewOutlined /> },
                ]),
            ...(perms.reports === false && !isDev
              ? []
              : [
                  {
                    key: "/reports",
                    label: "Reports",
                    icon: <FileTextOutlined />,
                    children: [
                      {
                        key: "/reports/statement-of-accounts",
                        label: "Statement of Accounts",
                      },
                      {
                        key: "/reports/collections-list",
                        label: "Collections List",
                      },
                      {
                        key: "/reports/account-vouchers",
                        label: "Account Vouchers",
                      },
                    ],
                  },
                ]),
            ...(perms.settings === false && !isDev
              ? []
              : [
                  {
                    key: "/settings",
                    label: "Settings",
                    icon: <SettingOutlined />,
                    children: settingsChildren,
                  },
                ]),
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
            color: headerText,
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
            {/* <Popover
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
            </Popover> */}

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
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
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
                src={avatarSrc || undefined}
                style={{
                  cursor: "pointer",
                  backgroundColor: avatarSrc ? undefined : "#1677ff",
                  color: avatarSrc ? undefined : "#fff",
                }}
              >
                {!avatarSrc ? avatarInitials : null}
              </Avatar>
            </Dropdown>
          </div>
        </Header>

        <div className="home-content-wrapper">
          <div className="home-scroll-area">
            <div className="home-scroll-inner">
              <Content className="home-content">
                <Outlet />
              </Content>
              {/* Footer shown inside the scroll area; fixed on desktop, non-fixed on small screens */}
              {/* <div className="home-footer" role="contentinfo">
                <div className="home-footer-left" />
                <div className="home-footer-center">
                  <span>© {new Date().getFullYear()} RACATOM-LMIS</span>
                </div>
                <div className="home-footer-right" />
              </div> */}
            </div>
          </div>
        </div>
      </Layout>
    </Layout>
  );
}

export default Home;
