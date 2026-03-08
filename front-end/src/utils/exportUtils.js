import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

export const exportData = async (data = [], options = {}) => {
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
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");

    // Title (merged across all columns)
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, columns.length + 1);
    titleRow.getCell(1).font = { bold: true, size: 14 };

    ws.addRow([]); // Spacer

    // Metadata
    ws.addRow(["Borrower:", metadata.name || ""]);
    ws.addRow(["Address:", metadata.address || ""]);
    ws.addRow(["Contact:", metadata.contact || ""]);
    ws.addRow(["Loan No:", metadata.loanNo || ""]);
    ws.addRow(["Collector:", metadata.collector || ""]);
    ws.addRow([]); // Spacer

    // Table Header (row 9)
    const tableHeader = ["#", ...columns.map((c) => c.header)];
    const headerRow = ws.addRow(tableHeader);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Table Body
    data.forEach((item, index) => {
        const row = [index + 1];
        columns.forEach((col) => {
            let value = item[col.key];
            if (col.format) value = col.format(value, item);
            row.push(value ?? "");
        });
        ws.addRow(row);
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
        ws.addRow(footerRow);
    }

    // Column widths
    ws.getColumn(1).width = 5;
    columns.forEach((_, i) => {
      ws.getColumn(i + 2).width = 18;
    });

    // Write and download
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `${fileTitle}.xlsx`);
  }
};