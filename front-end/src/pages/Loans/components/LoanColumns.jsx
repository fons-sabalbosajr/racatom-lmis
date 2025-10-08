import { Button, Space, Tag, Typography, Dropdown, Tooltip } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

import { getLoanStatusColor, getProcessStatusColor, getCollectionStatusColor } from "../../../utils/statusColors";

// Corporate Color Palette (moved to shared util for Loan Status)

// Mappings moved to shared util

export const getLoanColumns = ({
  viewLoan,
  onUpdateSingleLoan,
  viewCollectionSummary,
  generateStatementOfAccount,
  generateLoanSummary,
  onUpdateStatus, // Added this prop
}) => [
  {
    title: "Account / Loan No.",
    dataIndex: "accountId",
    key: "accountId",
    sorter: true,
    render: (_, record) => {
      const loanNo = record.loanInfo?.loanNo || record.loanNo;
      return (
        <div>
          <Text strong style={{ color: "#2b3a55" }}>
            {loanNo || "N/A"}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.accountId}
          </Text>
        </div>
      );
    },
  },
  {
    title: "Client Name",
    key: "client",
    width: 270,
    render: (_, record) => {
      // Prefer server-provided fullName (fast/minimal payload path), then fall back to clientInfo/person
      let fullName = record.fullName;
      if (!fullName) {
        const firstName =
          record.clientInfo?.FirstName ||
          record.person?.firstName ||
          record.FirstName ||
          "";
        const middleName =
          record.clientInfo?.MiddleName ||
          record.person?.middleName ||
          record.MiddleName ||
          "";
        const lastName =
          record.clientInfo?.LastName ||
          record.person?.lastName ||
          record.LastName ||
          "";
        fullName = `${firstName} ${middleName} ${lastName}`
          .replace(/\s+/g, " ")
          .trim();
      }

      const clientNo =
        record.loanInfo?.clientNo ||
        record.ClientNo ||
        record.clientInfo?.ClientNo ||
        record.clientNo;

      return (
        <div>
          <Typography.Text strong style={{ color: "#1a1a1a" }}>
            {fullName || "N/A"}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {clientNo || "N/A"}
          </Typography.Text>
        </div>
      );
    },
  },
  {
    title: "Loan Details",
    key: "loanInfo",
    width: 180,
    render: (record) => (
      <div>
        <Text>
          {new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
          }).format(record.loanInfo?.amount || 0)}
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Balance:{" "}
          {new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
          }).format(record.loanInfo?.balance || 0)}
        </Text>
        <br />
        <Tag color="blue" style={{ marginTop: 4 }}>
          {record.loanInfo?.paymentMode || "N/A"}
        </Tag>
      </div>
    ),
  },
  {
    title: "Location",
    dataIndex: "address",
    key: "location",
    render: (address) => {
      const location = [address?.barangay, address?.city, address?.province]
        .filter(Boolean)
        .join(", ");
      return <Text>{location || "N/A"}</Text>;
    },
  },
  {
    title: "Status Summary",
    key: "status",
    width: 260,
    render: (_, record) => {
      const loanStatus = record.loanInfo?.status || "N/A";
      const processStatus = record.loanInfo?.processStatus || "N/A";
      const collectionStatus = record.collectionStatus || "No Data Encoded";
      const isClosed = loanStatus === "CLOSED";

      return (
        <div className="loan-status-card compact">
          {/* Row 1 - Loan Status */}
          <div className="status-row with-action">
            <div className="status-item">
              <Text strong className="status-label">
                Loan Status:
              </Text>
              <Tag
                className="status-tag"
                color={getLoanStatusColor(loanStatus)}
              >
                {loanStatus}
              </Tag>
            </div>
            <Tooltip title="Update Status">
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined style={{ fontSize: 12 }} />}
                size="small"
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => onUpdateStatus(record)}
              />
            </Tooltip>
          </div>

          {/* Row 2 - Process Status */}
          <div className="status-row">
            <Text strong className="status-label">
              Process Status:
            </Text>
            <Tag
              className="status-tag"
              color={getProcessStatusColor(processStatus)}
            >
              {processStatus}
            </Tag>
          </div>

          {/* Row 3 - Collections */}
          <div className="status-row">
            <Text strong className="status-label">
              Collections:
            </Text>
            <Tag
              className="status-tag"
              color={getCollectionStatusColor(collectionStatus)}
            >
              {collectionStatus}
            </Tag>
          </div>

          {/* Optional - Closed Tag */}
          {isClosed && (
            <div className="status-closed">
              <Tag color="default" style={{ fontStyle: "italic" }}>
                Closed Account
              </Tag>
            </div>
          )}
        </div>
      );
    },
  },
  {
    title: "Actions",
    key: "actions",
    fixed: "right",
    align: "center",
    render: (_, record) => {
      const menuItems = [
        {
          key: "summary",
          icon: <BarChartOutlined />,
          label: "View Collection Summary",
        },
        {
          key: "statement",
          icon: <FileTextOutlined />,
          label: "Statement of Account (PDF)",
        },
        {
          key: "loanSummary",
          icon: <FilePdfOutlined />,
          label: "Loan Summary (PDF)",
        },
      ];

      const handleMenuClick = ({ key }) => {
        if (key === "summary") viewCollectionSummary(record);
        if (key === "statement") generateStatementOfAccount(record);
        if (key === "loanSummary") generateLoanSummary(record);
      };

      return (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => viewLoan(record)}
            />
          </Tooltip>
          {record.loanInfo?.loanNo?.includes("-R") && (
            <Tooltip title="Update Loan Number">
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => onUpdateSingleLoan(record)}
              />
            </Tooltip>
          )}
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      );
    },
  },
];
