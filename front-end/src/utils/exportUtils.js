import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

export const exportData = (data = [], options = {}) => {
  const {
    type = "excel",
    title = "Exported Data",
    metadata = {},
    columns = [],
    filename,
    includeTotals = false,
  } = options;

  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const fileTitle = filename || `${title.replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD_HHmm")}`;

  // ----------- PDF ----------->
  if (type === "pdf") {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFontSize(16);
    doc.text(title, 14, 15);

    doc.setFontSize(11);
    const lines = [
      `Borrower: ${metadata.name || ""}`,
      `Address: ${metadata.address || ""}`,
      `Contact: ${metadata.contact || ""}`,
      `Loan No: ${metadata.loanNo || ""}`,
      `Collector: ${metadata.collector || ""}`,
      `Generated: ${dayjs().format("MM/DD/YYYY HH:mm")}`,
    ];
    lines.forEach((line, idx) => doc.text(line, 14, 25 + idx * 6));

    const tableHead = [["#", ...columns.map((c) => c.header)]];
    const tableBody = data.map((item, index) => {
        const row = [index + 1];
        columns.forEach((col) => {
            let value = item[col.key];
            if (col.format) value = col.format(value, item);
            // Remove non-numeric characters for PDF values, except for specific columns
            if (typeof value === 'string' && (col.key === 'CollectionPayment' || col.key === 'RunningBalance' || col.key === 'Penalty')) {
                value = value.replace(/[^0-9.-]/g, "");
            }
            row.push(value ?? "");
        });
        return row;
    });

    if (includeTotals) {
        const footerRow = ["TOTAL"];
        columns.forEach((col) => {
            if (col.total) {
                const sum = data.reduce((acc, cur) => acc + (parseFloat(String(cur[col.key]).replace(/[^0-9.-]/g, '')) || 0), 0);
                footerRow.push(isNaN(sum) ? "" : sum.toLocaleString());
            } else {
                footerRow.push("");
            }
        });
        tableBody.push(footerRow);
    }

    autoTable(doc, {
      startY: 25 + lines.length * 6 + 5,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [114, 46, 209], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      styles: { cellPadding: 2, halign: "center" },
    });

    doc.save(`${fileTitle}.pdf`);
    return;
  }

  // ----------- EXCEL ----------->
  if (type === "excel") {
    const excelData = [];
    // Title
    excelData.push([title]);
    excelData.push([]); // Spacer

    // Metadata
    excelData.push(["Borrower:", metadata.name || ""]);
    excelData.push(["Address:", metadata.address || ""]);
    excelData.push(["Contact:", metadata.contact || ""]);
    excelData.push(["Loan No:", metadata.loanNo || ""]);
    excelData.push(["Collector:", metadata.collector || ""]);
    excelData.push([]); // Spacer

    // Table Header
    const tableHeader = ["#", ...columns.map((c) => c.header)];
    excelData.push(tableHeader);

    // Table Body
    data.forEach((item, index) => {
        const row = [index + 1];
        columns.forEach((col) => {
            let value = item[col.key];
            if (col.format) value = col.format(value, item);
            row.push(value ?? "");
        });
        excelData.push(row);
    });

    // Table Footer
    if (includeTotals) {
        const footerRow = ["TOTAL"];
        columns.forEach((col) => {
            if (col.total) {
                const sum = data.reduce((acc, cur) => acc + (parseFloat(String(cur[col.key]).replace(/[^0-9.-]/g, '')) || 0), 0);
                footerRow.push(isNaN(sum) ? "" : sum);
            } else {
                footerRow.push("");
            }
        });
        excelData.push(footerRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Merging
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length } }];

    // Column widths
    ws["!cols"] = [{ wch: 5 }, ...columns.map(() => ({ wch: 18 }))];
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(ws['!ref']);
    // Bold headers
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({r: 8, c: C});
        if(ws[address]) {
            ws[address].s = { font: { bold: true } };
        }
    }


    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${fileTitle}.xlsx`);
  }
};