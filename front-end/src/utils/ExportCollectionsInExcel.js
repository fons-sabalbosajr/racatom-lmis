import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

const ExportCollectionsInExcel = async (loan, collections) => {
  const clientName = `${loan.person?.firstName || ''} ${loan.person?.middleName || ''} ${loan.person?.lastName || ''}`;
  const accountId = loan.accountId;
  const loanStatus = loan.loanInfo?.status;
  const collector = loan.collectorInfo?.name || 'N/A';
  const address = loan.person?.presentAddress?.join(', ') || 'N/A';
  const contactNo = loan.person?.contactNo?.join(', ') || 'N/A';

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Collections');

  // Helper to add a bold-label row
  const addLabelRow = (label, value) => {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    return row;
  };

  // Client info
  addLabelRow('Name', clientName);
  addLabelRow('AccountId', accountId);
  addLabelRow('LoanStatus', loanStatus);
  addLabelRow('Collector', collector);
  addLabelRow('Address', address);
  addLabelRow('Contact No', contactNo);
  ws.addRow([]);

  // Loan Information header
  const loanInfoHeader = ws.addRow(['Loan Information']);
  loanInfoHeader.getCell(1).font = { bold: true };
  ws.addRow(['Loan Amount', loan.loanInfo?.amount?.toLocaleString() || 'N/A']);
  ws.addRow(['Net Proceeds', loan.loanInfo?.netProceeds?.toLocaleString() || 'N/A']);
  ws.addRow(['Loan Term', loan.loanInfo?.term || 'N/A']);
  ws.addRow(['Date Disbursed', dayjs(loan.loanInfo?.disbursedDate).format('MM/DD/YYYY')]);
  ws.addRow(['Payment Start Date', dayjs(loan.loanInfo?.startPaymentDate).format('MM/DD/YYYY')]);
  ws.addRow(['Maturity Date', dayjs(loan.loanInfo?.maturityDate).format('MM/DD/YYYY')]);
  ws.addRow(['Amortization', loan.loanInfo?.amortization?.toLocaleString() || 'N/A']);
  ws.addRow(['Payment Mode', loan.loanInfo?.paymentMode || 'N/A']);
  ws.addRow([]);

  // Collections header
  const collectionsHeaderRow = ws.addRow(['Collections']);
  collectionsHeaderRow.getCell(1).font = { bold: true };

  const colHeaders = ['Date', 'Reference No', 'Amortization', 'Payment', 'Balance', 'Penalty', 'Collector'];
  ws.addRow(colHeaders);

  // Collections data
  collections.forEach(item => {
    ws.addRow([
      dayjs(item.PaymentDate).format('MM/DD/YYYY'),
      item.CollectionReferenceNo,
      item.Amortization || 0,
      item.CollectionPayment || 0,
      item.RunningBalance || 0,
      0,
      item.CollectorName,
    ]);
  });

  // Summary
  ws.addRow([]);
  const summaryHeader = ws.addRow(['Collection Summary']);
  summaryHeader.getCell(1).font = { bold: true };
  ws.addRow(['Computed Penalty', 0]);
  ws.addRow(['Total Penalty Paid', 0]);
  ws.addRow(['Penalty Due', 0]);
  ws.addRow([]);
  ws.addRow(['Due as of Today', 0]);
  ws.addRow([]);
  ws.addRow(['Notes Receivable', 0]);
  ws.addRow(['Penalty Due', 0]);
  ws.addRow(['Total Due Today', 0]);
  ws.addRow([]);
  ws.addRow(['Balance of loan', collections[collections.length - 1]?.RunningBalance || 'N/A']);
  ws.addRow(['Note receivable', 0]);
  ws.addRow(['Penalty Due', 0]);
  ws.addRow(['Total', 0]);
  ws.addRow(['Less Rebate', 0]);
  ws.addRow(['Total / rebate', 0]);

  // Auto-fit column widths
  ws.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLength) maxLength = len;
    });
    column.width = maxLength + 2;
  });

  // Write and download
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `Collections-${accountId}-${dayjs().format('YYYY-MM-DD')}.xlsx`);
};

export default ExportCollectionsInExcel;