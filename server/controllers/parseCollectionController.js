import formidable from "formidable";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import LoanClient from '../models/LoanClient.js';
import LoanCycle from '../models/LoanCycle.js';

// 🧠 Parse header info (name, account no, address, etc.)
function parseHeaderInfo(lines) {
  const info = {};
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("name")) {
      info.Name = line.split(":")[1]?.trim();
    }
    if (lower.includes("account")) {
      const match = line.match(/account\s*(no|number)[:\s]*(.+)/i);
      if (match) info.AccountNumber = match[2]?.trim();
    }
    if (lower.startsWith("address")) {
      info.Address = line.split(":")[1]?.trim();
    }
    if (lower.startsWith("collector")) {
      info.Collector = line.split(":")[1]?.trim();
    }
  }
  return info;
}

// 🧠 Parse collection table lines
function parseWordCollections(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const regex =
    /^(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z0-9]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/;

  const data = [];
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const [_, date, refNo, total, lrpmt, balance, penalty] = match;
      data.push({
        PaymentDate: new Date(date),
        CollectionReferenceNo: refNo,
        Amortization: parseFloat(total.replace(/,/g, "")),
        CollectionPayment: parseFloat(lrpmt.replace(/,/g, "")),
        RunningBalance: parseFloat(balance.replace(/,/g, "")),
        Penalty: parseFloat(penalty.replace(/,/g, "")),
        RawLine: line,
      });
    }
  }
  return data;
}

// 📄 Main controller
export const parseWordFile = async (req, res) => {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ success: false, message: "Upload failed" });
    }

    try {
      const file = files.file?.[0];
      if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const ext = path.extname(file.originalFilename).toLowerCase();
      if (ext !== ".docx") {
        return res.status(400).json({
          success: false,
          message: "Please upload a valid .docx file",
        });
      }

      const buffer = fs.readFileSync(file.filepath);
      const result = await mammoth.extractRawText({ buffer });

      const allLines = result.value.split("\n").map((l) => l.trim()).filter(Boolean);
      const parsedData = parseWordCollections(result.value);
      const headerInfo = parseHeaderInfo(allLines);

      if (headerInfo.AccountNumber) {
        const loanClient = await LoanClient.findOne({ AccountId: headerInfo.AccountNumber });
        if (loanClient) {
            let clientNeedsUpdate = false;
            const nameParts = headerInfo.Name?.split(' ');
            const firstName = nameParts?.slice(0, -1).join(' ');
            const lastName = nameParts?.[nameParts.length - 1];

            if (firstName && lastName && (loanClient.FirstName !== firstName || loanClient.LastName !== lastName)) {
                loanClient.FirstName = firstName;
                loanClient.LastName = lastName;
                clientNeedsUpdate = true;
            }
            if (headerInfo.Address && loanClient.WorkAddress !== headerInfo.Address) {
                loanClient.WorkAddress = headerInfo.Address;
                clientNeedsUpdate = true;
            }
            if (clientNeedsUpdate) {
                await loanClient.save();
            }
        }

        const loanCycle = await LoanCycle.findOne({ AccountId: headerInfo.AccountNumber });
        if (loanCycle) {
            let cycleNeedsUpdate = false;
            if (headerInfo.Collector && loanCycle.CollectorName !== headerInfo.Collector) {
                loanCycle.CollectorName = headerInfo.Collector;
                cycleNeedsUpdate = true;
            }
            if (parsedData.length > 0 && parsedData[0].Amortization && loanCycle.Amortization !== parsedData[0].Amortization) {
                loanCycle.Amortization = parsedData[0].Amortization;
                cycleNeedsUpdate = true;
            }
            if (cycleNeedsUpdate) {
                await loanCycle.save();
            }
        }
      }

      res.json({
        success: true,
        data: parsedData,
        rawLines: allLines,
        info: headerInfo,
      });
    } catch (error) {
      console.error("Parsing failed:", error);
      res.status(500).json({ success: false, message: "Parsing failed" });
    }
  });
};
