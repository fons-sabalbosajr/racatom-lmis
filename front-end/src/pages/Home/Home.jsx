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
} from "@ant-design/icons";
import { decryptData } from "../../utils/storage";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./home.css";
import logo from "../../assets/lmis.svg"; // your logo
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api from "../../utils/axios";

dayjs.extend(relativeTime);

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { Panel } = Collapse;

function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const encryptedUser = localStorage.getItem("user");
      return encryptedUser ? decryptData(encryptedUser) : null;
    } catch (err) {
      console.error("Failed to decrypt user:", err);
      return null;
    }
  });

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
      localStorage.removeItem("user"); // logged-in user data
      localStorage.removeItem("onlineUser"); // encrypted online username
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

  return (
    <Layout className="home-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
      >
        <div
          className="home-logo"
          style={{
            color: "white",
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
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={[
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
              children: [
                { key: "/settings/loan-rates", label: "Loan Rates Config" },
                { key: "/settings/employees", label: "Employee Accounts" },
                { key: "/settings/collectors", label: "Collector Accounts" },
                { key: "/settings/database", label: "Database" },
                { key: "/settings/announcements", label: "Announcements" },
                { key: "/settings/accounting", label: "Accounting Center" },
              ],
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          className="home-header"
          style={{
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* ✅ Date/Time */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "white",
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
                    color: "white",
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
                    color: "white",
                    cursor: "pointer",
                  }}
                />
              </Badge>
            </Popover>

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