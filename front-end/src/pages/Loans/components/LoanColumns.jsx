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

// Corporate Color Palette
const LOAN_STATUS_COLORS = {
  UPDATED: "green",
  ARREARS: "orange",
  "PAST DUE": "red",
  LITIGATION: "volcano",
  DORMANT: "gray",
  CLOSED: "default",
};

const LOAN_PROCESS_STATUS_COLORS = {
  Updated: "green",
  Approved: "blue",
  Pending: "gold",
  Released: "purple",
  "Loan Released": "purple",
};

const COLLECTION_STATUS_COLORS = {
  Updated: "green",
  Outdated: "magenta",
  "No Data Encoded": "gray",
};

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
      // 🧠 Try both sources: new backend (clientInfo) and old structure (person)
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

      const fullName = `${firstName} ${middleName} ${lastName}`
        .replace(/\s+/g, " ")
        .trim();

      const clientNo =
        record.ClientNo ||
        record.clientInfo?.ClientNo ||
        record.loanInfo?.clientNo ||
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
 // src/components/LoanColumns.jsx (The "Status Summary" column)

  {
    title: "Status Summary",
    key: "status",
    width: 260,
    render: (_, record) => {
      const loanStatus = record.loanInfo?.status || "N/A";
      const processStatus = record.loanInfo?.processStatus || "N/A";
      
      // ✅ --- START OF FIX ---
      // This logic now directly checks if collections exist.
      const hasCollections = record.collectionCount > 0;
      const collectionTagText = hasCollections ? "With Collections" : "No Collections Yet";
      const collectionTagColor = hasCollections ? "green" : "gray";
      // ✅ --- END OF FIX ---

      const isClosed = loanStatus === "CLOSED";

      return (
        <div className="loan-status-card">
          {/* Row 1 - Loan Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Text strong style={{ width: 110 }}>
                Loan Status:
              </Text>
              <Tag color={LOAN_STATUS_COLORS[loanStatus] || "default"}>
                {loanStatus}
              </Tag>
            </div>
            <Tooltip title="Update Status">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => onUpdateStatus(record)}
              />
            </Tooltip>
          </div>

          {/* Row 2 - Process Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Text strong style={{ width: 110 }}>
              Process Status:
            </Text>
            <Tag color={LOAN_PROCESS_STATUS_COLORS[processStatus] || "default"}>
              {processStatus}
            </Tag>
          </div>

          {/* Row 3 - Collections (Modified) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Text strong style={{ width: 110 }}>
              Collections:
            </Text>
            {/* ✅ This tag now uses the new, clearer logic */}
            <Tag color={collectionTagColor}>
              {collectionTagText}
            </Tag>
          </div>

          {/* Optional - Closed Tag */}
          {isClosed && (
            <div style={{ marginTop: 8, textAlign: "center" }}>
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
