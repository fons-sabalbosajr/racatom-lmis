import { Button, Space, Tag, Typography, Popconfirm, message } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const statusColor = (status) => {
  if (!status) return "default";
  if (status.toLowerCase().includes("updated")) return "green";
  if (status.toLowerCase().includes("pending")) return "orange";
  if (status.toLowerCase().includes("rejected")) return "red";
  return "blue";
};

export const getLoanColumns = ({ viewLoan, deleteLoan }) => [
  {
    title: "Account / Loan",
    dataIndex: "accountId", // ✅ set actual field for sorter
    key: "accountId",
    sorter: true, // ✅ tells antd to pass sorter info back
    render: (_, record) => {
      const loanNo = record.loanInfo?.loanNo || record.loanNo;

      return (
        <div className="loan-col-account">
          <div className="loan-col-main">
            {loanNo ? (
              <Text strong>{loanNo}</Text>
            ) : (
              <Text type="danger">
                <WarningOutlined /> Missing LoanNo
              </Text>
            )}
          </div>
          <div className="loan-col-sub">
            <Text type="secondary">{record.accountId}</Text>
          </div>
        </div>
      );
    },
  },
  {
    title: "Client",
    dataIndex: "person",
    key: "client",
    render: (person, record) => {
      const name = `${person?.firstName || ""} ${person?.middleName || ""} ${
        person?.lastName || ""
      }`.trim();
      return (
        <div className="loan-col-client">
          <div className="loan-col-main">
            <Text strong>{name || record.fullName}</Text>
          </div>
          <div className="loan-col-sub">
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.clientNo || record.loanInfo?.clientNo}
            </Text>
          </div>
        </div>
      );
    },
  },
  {
    title: "Loan Info",
    dataIndex: "loanInfo",
    key: "loanInfo",
    render: (li) => (
      <div className="loan-col-info">
        <div>{li?.amount}</div>
        <div className="loan-col-sub">Balance: {li?.balance}</div>
        <div>
          <Tag>{li?.paymentMode}</Tag>
        </div>
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
      return <Text>{location}</Text>; // ✅ plain text instead of sub layout
    },
  },
  {
    title: "Status",
    dataIndex: ["loanInfo", "status"],
    key: "status",
    render: (status) => <Tag color={statusColor(status)}>{status}</Tag>,
  },
  {
    title: "Actions",
    key: "actions",
    fixed: "right",
    render: (_, record) => (
      <Space>
        <Button
          icon={<EyeOutlined />}
          size="small"
          type="primary"
          onClick={() => viewLoan(record)}
        />
        
        <Popconfirm
          title="Delete loan?"
          onConfirm={() => deleteLoan(record._id)}
        >
          <Button danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      </Space>
    ),
  },
];
