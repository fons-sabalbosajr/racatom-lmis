import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const ExportLoanSummaryPDF = (loan) => {
  const doc = new jsPDF();

  const formatDate = (date) => (date ? dayjs(date).format("MM/DD/YYYY") : "N/A");

  const clientName = `${loan.person?.firstName || ""} ${loan.person?.middleName || ""} ${loan.person?.lastName || ""}`.trim();
  const accountId = loan.accountId;
  const loanStatus = loan.loanInfo?.status;
  const address = [loan.address?.barangay, loan.address?.city, loan.address?.province].filter(Boolean).join(", ");
  const contactNo = loan.contact?.contactNumber;

  doc.setFontSize(18);
  doc.text("Loan Summary", 14, 22);
  doc.setFontSize(11);
  doc.text(`Date Generated: ${dayjs().format("MM/DD/YYYY")}`, 14, 32);

  autoTable(doc, {
    startY: 40,
    head: [['Client Information', '']],
    body: [
      ['Account ID', accountId],
      ['Client Name', clientName],
      ['Address', address],
      ['Contact No.', contactNo],
    ],
    theme: 'striped',
    headStyles: { fillColor: [22, 160, 133] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Loan Details', '']],
    body: [
        ['Loan No', loan.loanInfo?.loanNo],
        ['Loan Status', loanStatus],
        ['Loan Type', loan.loanInfo?.type],
        ['Loan Amount', `₱${loan.loanInfo?.amount?.toLocaleString() || '0.00'}`],
        ['Loan Balance', `₱${loan.loanInfo?.balance?.toLocaleString() || '0.00'}`],
        ['Term', loan.loanInfo?.term],
        ['Payment Mode', loan.loanInfo?.paymentMode],
        ['Maturity Date', formatDate(loan.loanInfo?.maturityDate)],
        ['Collector', loan.loanInfo?.collectorName],
    ],
    theme: 'striped',
    headStyles: { fillColor: [22, 160, 133] },
  });

  doc.save(`Loan-Summary-${accountId}-${dayjs().format("YYYY-MM-DD")}.pdf`);
};

export default ExportLoanSummaryPDF;
