import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const ExportLoanSummaryPDF = (loan) => {
  const doc = new jsPDF();

  // Helpers
  const fmtDate = (date) => (date ? dayjs(date).format("MM/DD/YYYY") : "N/A");
  const fmtPeso = (num) => {
    const n = typeof num === "number" ? num : Number(num);
    return `₱${(!isNaN(n) ? n : 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Derived
  const clientName = `${loan.person?.firstName || ""} ${loan.person?.middleName || ""} ${loan.person?.lastName || ""}`.trim();
  const accountId = loan.accountId || loan.account?.id || "N/A";
  const loanStatus = loan.loanInfo?.status || "N/A";
  const address = [loan.address?.barangay, loan.address?.city, loan.address?.province].filter(Boolean).join(", ") || "N/A";
  const contactNo = loan.contact?.contactNumber || "N/A";

  // Layout constants
  const leftMargin = 14;
  const rightMargin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Client Information
  autoTable(doc, {
    startY: 18,
    theme: "striped",
    head: [["Client Information", ""]],
    body: [
      ["Account ID", accountId],
      ["Client Name", clientName || "N/A"],
      ["Address", address],
      ["Contact No.", contactNo],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 160, 133] },
    columnStyles: { 0: { cellWidth: 45 } },
    margin: { left: leftMargin, right: rightMargin },
    didDrawPage: (data) => {
      // Header per page
      const { left, right } = data.settings.margin;
      const pw = doc.internal.pageSize.getWidth();
      doc.setFontSize(14);
      doc.text("Loan Summary", left, 12);
      doc.setFontSize(9);
      doc.text(`Generated: ${dayjs().format("MM/DD/YYYY")}`, pw - right - 40, 12);
    },
  });

  // Loan Details
  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 18) + 8,
    theme: "striped",
    head: [["Loan Details", ""]],
    body: [
      ["Loan No", loan.loanInfo?.loanNo || "N/A"],
      ["Loan Status", loanStatus],
      ["Loan Type", loan.loanInfo?.type || "N/A"],
      ["Loan Amount", fmtPeso(loan.loanInfo?.amount)],
      ["Loan Balance", fmtPeso(loan.loanInfo?.balance)],
      ["Amortization", fmtPeso(loan.loanInfo?.amortization)],
      ["Term", loan.loanInfo?.term || "N/A"],
      ["Payment Mode", loan.loanInfo?.paymentMode || "N/A"],
      ["Date Disbursed", fmtDate(loan.loanInfo?.disbursedDate)],
      ["Start Payment", fmtDate(loan.loanInfo?.startPaymentDate)],
      ["Maturity Date", fmtDate(loan.loanInfo?.maturityDate)],
      ["Collector", loan.loanInfo?.collectorName || loan.collectorInfo?.name || "N/A"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 160, 133] },
    columnStyles: { 0: { cellWidth: 45 } },
    margin: { left: leftMargin, right: rightMargin, bottom: 18 },
  });

  // Footer: page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageLabel = `Page ${i} of ${pageCount}`;
    doc.setFontSize(8);
    doc.text(pageLabel, pageWidth - rightMargin - 20, pageHeight - 8);
  }

  doc.save(`Loan-Summary-${accountId}-${dayjs().format("YYYY-MM-DD")}.pdf`);
};

export default ExportLoanSummaryPDF;
