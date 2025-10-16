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

import {
  getLoanStatusColor,
  getProcessStatusColor,
  getCollectionStatusColor,
} from "../../../utils/statusColors";
import { getAutomatedLoanStatusDetailed } from "../../../utils/automatedLoanStatus";
import "./loancolumns.css";

// Corporate Color Palette (moved to shared util for Loan Status)

// Mappings moved to shared util

export const getLoanColumns = ({
  viewLoan,
  onUpdateSingleLoan,
  viewCollectionSummary,
  generateStatementOfAccount,
  generateLoanSummary,
  onUpdateStatus, // quick update status handler
  enableAutoLoanStatus = false, // dev setting flag passed from parent
  autoLoanStatusGrace,
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
        <div className="loan-loanno-cell">
          <Text strong>{loanNo || "N/A"}</Text>
          {loanNo && /-R$/i.test(loanNo) && (
            <Tag color="gold" style={{ marginLeft: 8 }}>Needs suffix</Tag>
          )}
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
        <div className="loan-clientname-cell">
          <Typography.Text strong>{fullName || "N/A"}</Typography.Text>
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
      <div className="loan-loandetails-cell">
        <Text className="loan-amount-text">
          {new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
          }).format((record.displayLoanInfo?.amount ?? record.loanInfo?.amount) || 0)}
        </Text>
        <br />
        <Text
          className="loan-balance-text"
          type="secondary"
          style={{ fontSize: 12 }}
        >
          Bal:{" "}
          {new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
          }).format((record.displayLoanInfo?.balance ?? record.loanInfo?.balance) || 0)}
        </Text>
        <br />
        <Tag color="blue" style={{ marginTop: 4 }}>
          {record.displayLoanInfo?.paymentMode || record.loanInfo?.paymentMode || "N/A"}
        </Tag>
      </div>
    ),
  },
  {
    title: "Location",
    dataIndex: "address",
    key: "location",
    width: 280,
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
          (record &&
            (record.Address ||
              record.addressText ||
              record.clientInfo?.Address)) ||
          "";
      }
      return (
        <div className="loan-location-cell">
          <Text>{location || "N/A"}</Text>
        </div>
      );
    },
  },
  {
    title: "Status Summary",
    key: "status",
    width: 260,
    render: (_, record) => {
      // Prefer backend/stored loan status, but optionally override via automated status rules
      let loanStatus = record.loanInfo?.status || "N/A";
      let statusReason = "";
      if (enableAutoLoanStatus && loanStatus !== "CLOSED") {
        const auto = getAutomatedLoanStatusDetailed({
          paymentMode: record.loanInfo?.paymentMode,
          lastCollectionDate:
            record.loanInfo?.lastCollectionDate || record.lastCollectionDate,
          maturityDate: record.loanInfo?.maturityDate,
          collectionStatus: record.collectionStatus,
          currentDate: new Date(),
          thresholds: autoLoanStatusGrace,
        });
        if (auto?.status) {
          loanStatus = auto.status;
          statusReason = auto.reason || "";
        }
      }
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
              <Tooltip title={statusReason || undefined} placement="top">
                <Tag
                  className="status-tag"
                  color={getLoanStatusColor(loanStatus)}
                >
                  {loanStatus}
                </Tag>
              </Tooltip>
            </div>
            <Tooltip title="Quick Update Status" size="small">
              <Button
                icon={<EditOutlined style={{ fontSize: 10 }} />}
                size="small"
                className="loan-status-update-btn"
                style={{
                  background: "#27ae60",
                  borderColor: "#27ae60",
                  color: "#fff",
                  width: 20,
                  height: 20,
                  padding: 0,
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
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
    className: "loan-actions-col",
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
        <div className="loan-actions-cell">
          <Space size={6}>
            <Tooltip title="View Details">
              <Button
                type="primary"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => viewLoan(record)}
              />
            </Tooltip>
            {/ -R$/i.test(record.loanInfo?.loanNo || "") && (
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
        </div>
      );
    },
  },
];
