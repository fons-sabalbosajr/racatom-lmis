import formidable from "formidable";
import fs from "fs";
import path from "path";
import os from "os";

// Middleware to parse a single file upload for loan documents
export default function uploadLoanDocument(req, res, next) {
  // Use OS temp directory to avoid persisting files locally
  const uploadDir = os.tmpdir();

  const form = formidable({
    multiples: true,
    maxFileSize: 15 * 1024 * 1024, // 15MB each
    uploadDir,
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(400).json({ success: false, message: "Upload failed" });

    const arr = Array.isArray(files.file) ? files.file : files.file ? [files.file] : [];
    if (!arr.length) return res.status(400).json({ success: false, message: "No file provided" });

    const toMeta = (f) => ({
      newFilename: f.newFilename,
      originalFilename: f.originalFilename,
      mimetype: f.mimetype,
      size: f.size,
      filepath: f.filepath,
      // relativePath retained for backward compatibility but points to temp
      relativePath: path.join(uploadDir, f.newFilename),
    });
    req.filesMeta = arr.map(toMeta);
    // Backward compatibility: first file as single meta
    req.fileMeta = req.filesMeta[0];
    req.body = fields; // pass through any fields
    next();
  });
}
