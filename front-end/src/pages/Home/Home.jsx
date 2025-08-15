import React from "react";
import { Layout, Menu, Avatar, Button, Card, Typography } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { decryptData } from "../../utils/storage"; // ✅ import decrypt function
import "./home.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function Home() {
  const user = (() => {
    try {
      const encryptedUser = localStorage.getItem("user");
      return encryptedUser ? JSON.parse(decryptData(encryptedUser)) : null;
    } catch (err) {
      console.error("Failed to decrypt user:", err);
      return null;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const avatarSrc = user?.Photo
    ? `data:image/png;base64,${user.Photo}`
    : null;

  return (
    <Layout className="home-layout">
      <Header className="home-header">
        <div className="home-logo">Loan Management System</div>
        <Menu
          mode="horizontal"
          selectable={false}
          items={[
            {
              key: "user",
              icon: avatarSrc ? (
                <Avatar src={avatarSrc} />
              ) : (
                <Avatar icon={<UserOutlined />} />
              ),
              label: user?.FullName || "User",
            },
            {
              key: "logout",
              label: (
                <Button
                  type="primary"
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              ),
            },
          ]}
        />
      </Header>

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

      <Footer className="home-footer">
        © {new Date().getFullYear()} Loan Management System
      </Footer>
    </Layout>
  );
}

export default Home;
