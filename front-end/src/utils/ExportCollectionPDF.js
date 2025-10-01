import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const ExportCollectionPDF = (loan, collections) => {
  const doc = new jsPDF();

  const formatDate = (date) => dayjs(date).format("MM/DD/YYYY");

  const clientName = `${loan.person?.firstName || ""} ${
    loan.person?.middleName || ""
  } ${loan.person?.lastName || ""}`;
  const accountId = loan.accountId;
  const loanStatus = loan.loanInfo?.status;
  const collector = loan.collectorInfo?.name || "N/A";
  const address = loan.person?.presentAddress?.join(", ") || "N/A";
  const contactNo = loan.person?.contactNo?.join(", ") || "N/A";

  doc.setFontSize(9);
  doc.text("Collection Details", 14, 22);
  doc.setFontSize(9);
  doc.text(`Name: ${clientName}`, 14, 32);
  doc.text(`Account ID: ${accountId}`, 14, 38);
  doc.text(`Loan Status: ${loanStatus}`, 14, 44);
  doc.text(`Collector: ${collector}`, 14, 50);
  doc.text(`Address: ${address}`, 14, 56);
  doc.text(`Contact No: ${contactNo}`, 14, 62);

  doc.setFontSize(9);
  doc.text("Loan Information", 14, 72);
  doc.setFontSize(9);
  doc.text(
    `Loan Amount: ${loan.loanInfo?.amount?.toLocaleString() || "N/A"}`,
    14,
    80
  );
  doc.text(
    `Net Proceeds: ${loan.loanInfo?.netProceeds?.toLocaleString() || "N/A"}`,
    14,
    86
  );
  doc.text(`Loan Term: ${loan.loanInfo?.term || "N/A"}`, 14, 92);
  doc.text(
    `Date Disbursed: ${formatDate(loan.loanInfo?.disbursedDate)}`,
    14,
    98
  );
  doc.text(
    `Payment Start Date: ${formatDate(loan.loanInfo?.startPaymentDate)}`,
    14,
    104
  );
  doc.text(
    `Maturity Date: ${formatDate(loan.loanInfo?.maturityDate)}`,
    14,
    110
  );
  doc.text(
    `Amortization: ${loan.loanInfo?.amortization?.toLocaleString() || "N/A"}`,
    14,
    116
  );
  doc.text(`Payment Mode: ${loan.loanInfo?.paymentMode || "N/A"}`, 14, 122);

  const tableColumn = [
    "Date",
    "Reference No",
    "Amortization",
    "Payment",
    "Balance",
    "Penalty",
    "Collector",
  ];
  const tableRows = [];

  collections.forEach((item) => {
    const rowData = [
      formatDate(item.PaymentDate),
      item.CollectionReferenceNo,
      item.Amortization?.toLocaleString() || "0",
      item.CollectionPayment?.toLocaleString() || "0",
      item.RunningBalance?.toLocaleString() || "0",
      "0", // Placeholder for penalty
      item.CollectorName,
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    startY: 130,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 160, 133] },
  });

  let finalY = doc.lastAutoTable.finalY || 140;

  // Collection Summary
  doc.setFontSize(9);
  doc.text("Collection Summary", 14, finalY + 10);
  doc.setFontSize(9);
  doc.text("Computed Penalty: 0", 14, finalY + 18);
  doc.text("Total Penalty Paid: 0", 14, finalY + 24);
  doc.text("Penalty Due: 0", 14, finalY + 30);

  doc.text("Due as of Today: 0", 14, finalY + 40);

  doc.text("Notes Receivable: 0", 14, finalY + 50);
  doc.text("Penalty Due: 0", 14, finalY + 56);
  doc.text("Total Due Today: 0", 14, finalY + 62);

  doc.text(
    `Balance of loan: ${
      collections[collections.length - 1]?.RunningBalance?.toLocaleString() || "N/A"
    }`,
    14,
    finalY + 72
  );
  doc.text("Note receivable: 0", 14, finalY + 78);
  doc.text("Penalty Due: 0", 14, finalY + 84);
  doc.text("Total: 0", 14, finalY + 90);
  doc.text("Less Rebate: 0", 14, finalY + 96);
  doc.text("Total / rebate: 0", 14, finalY + 102);

  doc.save(`Collections-${accountId}-${dayjs().format("YYYY-MM-DD")}.pdf`);
};

export default ExportCollectionPDF;
