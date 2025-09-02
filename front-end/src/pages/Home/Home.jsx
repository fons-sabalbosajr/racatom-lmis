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
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { decryptData } from "../../utils/storage";
import "./home.css";

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;

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

  // Fetch notifications (simulate dynamic fetching)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Replace with your API endpoint
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/notifications`,
          {
            withCredentials: true,
          }
        );
        setNotifications(res.data?.notifications || []);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        // Example fallback notifications
        setNotifications([
          { id: 1, message: "New loan request received" },
          { id: 2, message: "Monthly report is ready" },
        ]);
      }
    };

    fetchNotifications();

    // Optional: poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      // Call backend to clear cookie/session
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );

      // Clear local storage
      localStorage.removeItem("user");
      setUser(null);
      setNotifications([]);
      // Replace history so back button won't access protected page
      window.location.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Avatar handling
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

  // User menu (avatar + name dropdown)
  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        {user?.FullName || "User"}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  // Notifications dropdown
  const notifMenu = (
    <Card style={{ width: 300, maxHeight: 400, overflowY: "auto" }}>
      <List
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item key={item.id}>{item.message}</List.Item>
        )}
        locale={{ emptyText: "No new notifications" }}
      />
    </Card>
  );

  return (
    <Layout className="home-layout">
      {/* Side Menu */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
      >
        <div
          className="home-logo"
          style={{ color: "white", textAlign: "center", padding: "16px" }}
        >
          {collapsed ? "LMS" : "Loan Management System"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={["1"]}
          items={[
            { key: "1", label: "Dashboard", icon: <UserOutlined /> },
            { key: "2", label: "Loans", icon: <UserOutlined /> },
            { key: "3", label: "Reports", icon: <UserOutlined /> },
            { key: "4", label: "Settings", icon: <UserOutlined /> },
          ]}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        <Header
          className="home-header"
          style={{
            background: "#001529",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left: toggle + page title */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: "white", fontSize: "16px", marginRight: "16px" }}
            />
            <span
              style={{ color: "white", fontSize: "1.2rem", fontWeight: "bold" }}
            >
              Dashboard
            </span>
          </div>

          {/* Right: notifications + user */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Dropdown
              overlay={notifMenu}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Badge count={notifications.length} offset={[0, 0]}>
                <Button
                  type="text"
                  icon={
                    <BellOutlined
                      style={{ color: "white", fontSize: "20px" }}
                    />
                  }
                />
              </Badge>
            </Dropdown>

            <Dropdown
              overlay={userMenu}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  gap: "8px",
                }}
              >
                <Avatar src={avatarSrc} icon={!avatarSrc && <UserOutlined />} />
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {user?.FullName || "User"}
                </Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="home-content">
          <Card className="home-card">
            <Title level={3}>Welcome, {user?.FullName || "Guest"}</Title>
            {user?.Position && (
              <>
                <Text strong>Position:</Text> <Text>{user.Position}</Text>
              </>
            )}
          </Card>
        </Content>

        {/* Footer */}
        <Footer className="home-footer">
          © {new Date().getFullYear()} Loan Management System
        </Footer>
      </Layout>
    </Layout>
  );
}

export default Home;
