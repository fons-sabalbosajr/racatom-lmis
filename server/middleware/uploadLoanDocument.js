import formidable from "formidable";
import fs from "fs";
import path from "path";

// Middleware to parse a single file upload for loan documents
export default function uploadLoanDocument(req, res, next) {
  const uploadDir = path.join(process.cwd(), "uploads", "loan-documents");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    multiples: false,
    maxFileSize: 15 * 1024 * 1024, // 15MB
    uploadDir,
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(400).json({ success: false, message: "Upload failed" });
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ success: false, message: "No file provided" });
    // Attach metadata for controller
    req.fileMeta = {
      newFilename: file.newFilename,
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      filepath: file.filepath,
      relativePath: path.join(uploadDir, file.newFilename),
    };
    req.body = fields; // pass through any fields
    next();
  });
}
