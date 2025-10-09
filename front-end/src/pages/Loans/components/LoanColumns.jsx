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
    width: 200,
    ellipsis: true,
    render: (_, record) => {
      const loanNo = record.loanInfo?.loanNo || record.loanNo;
      return (
        <div>
          <Text strong>
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
          <Typography.Text strong>
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
    render: (address, record) => {
      // address can be an object or a string depending on payload
      let location = "";
      if (typeof address === "string") {
        location = address.trim();
      } else {
        const a = address || record?.clientInfo?.address || {};
        const parts = [a?.barangay, a?.city, a?.province].filter(Boolean);
        location = parts.join(", ");
      }
      // Fallback to other possible fields
      if (!location) {
        location =
          (record && (record.Address || record.addressText || record.clientInfo?.Address)) || "";
      }
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
            <Tooltip title="Quick Update Status" size="small">
              <Button
                icon={<EditOutlined style={{ fontSize: 10 }} />}
                size="small"
                className="loan-status-update-btn"
                style={{
                  background: '#27ae60',
                  borderColor: '#27ae60',
                  color: '#fff',
                  width: 20,
                  height: 20,
                  padding: 0,
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
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
