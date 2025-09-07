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
  DollarOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { decryptData } from "../../utils/storage";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./home.css";
import logo from "../../assets/lmis.svg"; // your logo

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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/announcements`,
          {
            withCredentials: true,
          }
        );
        setNotifications(res.data.announcements || []);
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
        setNotifications([]);
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      // Call backend to invalidate session/cookie
      await axios.post(
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
            { key: "/loans", label: "Loans", icon: <DollarOutlined /> },
            { key: "/reports", label: "Reports", icon: <FileTextOutlined /> },
            {
              key: "/settings",
              label: "Settings",
              icon: <SettingOutlined />,
              children: [
                { key: "/settings/loan-rates", label: "Loan Rates Config" },
                { key: "/settings/employees", label: "Employee Accounts" },
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
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: "white", fontSize: "16px" }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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

            {/* Notifications */}
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
            {/* User avatar only */}
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
