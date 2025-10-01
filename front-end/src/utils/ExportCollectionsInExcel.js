import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const ExportCollectionsInExcel = (loan, collections) => {
  const clientName = `${loan.person?.firstName || ''} ${loan.person?.middleName || ''} ${loan.person?.lastName || ''}`;
  const accountId = loan.accountId;
  const loanStatus = loan.loanInfo?.status;
  const collector = loan.collectorInfo?.name || 'N/A';
  const address = loan.person?.presentAddress?.join(', ') || 'N/A';
  const contactNo = loan.person?.contactNo?.join(', ') || 'N/A';

  const data = [
    [{v: 'Name', s: { font: { bold: true } } }, clientName],
    [{v: 'AccountId', s: { font: { bold: true } } }, accountId],
    [{v: 'LoanStatus', s: { font: { bold: true } } }, loanStatus],
    [{v: 'Collector', s: { font: { bold: true } } }, collector],
    [{v: 'Address', s: { font: { bold: true } } }, address],
    [{v: 'Contact No', s: { font: { bold: true } } }, contactNo],
    [],
    [{v: 'Loan Information', s: { font: { bold: true } } }],
    ['Loan Amount', loan.loanInfo?.amount?.toLocaleString() || 'N/A'],
    ['Net Proceeds', loan.loanInfo?.netProceeds?.toLocaleString() || 'N/A'],
    ['Loan Term', loan.loanInfo?.term || 'N/A'],
    ['Date Disbursed', dayjs(loan.loanInfo?.disbursedDate).format('MM/DD/YYYY')],
    ['Payment Start Date', dayjs(loan.loanInfo?.startPaymentDate).format('MM/DD/YYYY')],
    ['Maturity Date', dayjs(loan.loanInfo?.maturityDate).format('MM/DD/YYYY')],
    ['Amortization', loan.loanInfo?.amortization?.toLocaleString() || 'N/A'],
    ['Payment Mode', loan.loanInfo?.paymentMode || 'N/A'],
    [],
    [{v: 'Collections', s: { font: { bold: true } } }],
  ];

  const collectionsHeader = [
    'Date',
    'Reference No',
    'Amortization',
    'Payment',
    'Balance',
    'Penalty',
    'Collector',
  ];

  const collectionsData = collections.map(item => [
    dayjs(item.PaymentDate).format('MM/DD/YYYY'),
    item.CollectionReferenceNo,
    item.Amortization || 0,
    item.CollectionPayment || 0,
    item.RunningBalance || 0,
    0, // Placeholder for penalty
    item.CollectorName,
  ]);

  const summaryData = [
    [],
    [{v: 'Collection Summary', s: { font: { bold: true } } }],
    ['Computed Penalty', 0],
    ['Total Penalty Paid', 0],
    ['Penalty Due', 0],
    [],
    ['Due as of Today', 0],
    [],
    ['Notes Receivable', 0],
    ['Penalty Due', 0],
    ['Total Due Today', 0],
    [],
    ['Balance of loan', collections[collections.length - 1]?.RunningBalance || 'N/A'],
    ['Note receivable', 0],
    ['Penalty Due', 0],
    ['Total', 0],
    ['Less Rebate', 0],
    ['Total / rebate', 0],
  ];

  const finalData = [...data, collectionsHeader, ...collectionsData, ...summaryData];

  const ws = XLSX.utils.aoa_to_sheet(finalData);

  const getMaxLength = (arr) => arr.reduce((max, item) => {
    const len = item ? String(item).length : 0;
    return Math.max(max, len);
  }, 0);

  const colWidths = finalData[0].map((_, i) => {
    const maxLength = getMaxLength(finalData.map(row => row[i]));
    return { width: maxLength + 2 }; // adding extra space
  });

  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Collections');

  XLSX.writeFile(wb, `Collections-${accountId}-${dayjs().format('YYYY-MM-DD')}.xlsx`);
};

export default ExportCollectionsInExcel;