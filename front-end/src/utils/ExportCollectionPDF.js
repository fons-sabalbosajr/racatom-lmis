import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const ExportCollectionPDF = (loan, collections) => {
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

  // Derived fields with fallbacks (handles legacy shapes)
  const clientName = `${loan.person?.firstName || ""} ${loan.person?.middleName || ""} ${loan.person?.lastName || ""}`.trim();
  const accountId = loan.accountId || loan.account?.id || "N/A";
  const loanStatus = loan.loanInfo?.status || "N/A";
  const collector = loan.collectorInfo?.name || loan.loanInfo?.collectorName || "N/A";
  const addressFromArray = Array.isArray(loan.person?.presentAddress)
    ? loan.person.presentAddress.filter(Boolean).join(", ")
    : "";
  const addressFromObject = [loan.address?.barangay, loan.address?.city, loan.address?.province]
    .filter(Boolean)
    .join(", ");
  const address = addressFromArray || addressFromObject || "N/A";
  const contactFromArray = Array.isArray(loan.person?.contactNo)
    ? loan.person.contactNo.filter(Boolean).join(", ")
    : "";
  const contactFromObject = loan.contact?.contactNumber || "";
  const contactNo = contactFromArray || contactFromObject || "N/A";

  // Layout constants
  const leftMargin = 14;
  const rightMargin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Client Information table
  autoTable(doc, {
    startY: 22,
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
  });

  // Loan Information table
  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 22) + 6,
    theme: "striped",
    head: [["Loan Information", ""]],
    body: [
      ["Loan No", loan.loanInfo?.loanNo || "N/A"],
      ["Status", loanStatus],
      ["Type", loan.loanInfo?.type || "N/A"],
      ["Loan Amount", fmtPeso(loan.loanInfo?.amount)],
      ["Loan Balance", fmtPeso(loan.loanInfo?.balance)],
      ["Amortization", fmtPeso(loan.loanInfo?.amortization)],
      ["Term", loan.loanInfo?.term || "N/A"],
      ["Payment Mode", loan.loanInfo?.paymentMode || "N/A"],
      ["Date Disbursed", fmtDate(loan.loanInfo?.disbursedDate)],
      ["Start Payment", fmtDate(loan.loanInfo?.startPaymentDate)],
      ["Maturity Date", fmtDate(loan.loanInfo?.maturityDate)],
      ["Collector", collector],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 160, 133] },
    columnStyles: { 0: { cellWidth: 45 } },
  });

  // Collections table
  const tableColumns = [
    { header: "Date", dataKey: "date" },
    { header: "Reference No", dataKey: "ref" },
    { header: "Amortization", dataKey: "amort" },
    { header: "Payment", dataKey: "pay" },
    { header: "Balance", dataKey: "bal" },
    { header: "Penalty", dataKey: "pen" },
    { header: "Collector", dataKey: "col" },
  ];

  const rows = (collections || []).map((item) => {
    const penaltyRaw = item.Penalty ?? item.CollectionPenalty ?? item.PenaltyPaid ?? 0;
    return {
      date: fmtDate(item.PaymentDate),
      ref: item.CollectionReferenceNo || "",
      amort: fmtPeso(item.Amortization || 0),
      pay: fmtPeso(item.CollectionPayment || 0),
      bal: fmtPeso(item.RunningBalance || 0),
      pen: fmtPeso(penaltyRaw || 0),
      col: item.CollectorName || "",
    };
  });

  // Totals for summary
  const totalPayment = (collections || []).reduce((sum, it) => sum + (parseFloat(it.CollectionPayment ?? it.TotalCollected ?? 0) || 0), 0);
  const totalPenalty = (collections || []).reduce((sum, it) => sum + (parseFloat(it.Penalty ?? it.CollectionPenalty ?? it.PenaltyPaid ?? 0) || 0), 0);
  const lastBalance = (collections && collections.length > 0)
    ? (collections[collections.length - 1].RunningBalance || 0)
    : (loan.loanInfo?.balance || 0);

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 22) + 10,
    head: [tableColumns.map((c) => c.header)],
    body: rows.map((r) => [r.date, r.ref, r.amort, r.pay, r.bal, r.pen, r.col]),
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 160, 133] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { top: 28, bottom: 20, left: leftMargin, right: rightMargin },
    didDrawPage: (data) => {
      // Repeatable header per page
      const { left, right } = data.settings.margin;
      const pw = doc.internal.pageSize.getWidth();
      doc.setFontSize(12);
      doc.text("Loan Collections Report", left, 14);
      doc.setFontSize(8);
      doc.text(`Account: ${accountId}`, left, 19);
      doc.text(`Client: ${clientName || "N/A"}`, left, 24);
      doc.text(`Generated: ${dayjs().format("MM/DD/YYYY")}`, pw - right - 40, 14);
    },
  });

  // Summary block
  const finalY = doc.lastAutoTable?.finalY || 140;
  autoTable(doc, {
    startY: finalY + 8,
    theme: "striped",
    head: [["Collection Summary", ""]],
    body: [
      ["Total Paid", fmtPeso(totalPayment)],
      ["Total Penalty", fmtPeso(totalPenalty)],
      ["Current Balance", fmtPeso(lastBalance)],
      ["Amortization", fmtPeso(loan.loanInfo?.amortization)],
      ["Payment Mode", loan.loanInfo?.paymentMode || "N/A"],
      ["Status", loanStatus],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 160, 133] },
    columnStyles: { 0: { cellWidth: 45 } },
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

  doc.save(`Collections-${accountId}-${dayjs().format("YYYY-MM-DD")}.pdf`);
};

export default ExportCollectionPDF;
