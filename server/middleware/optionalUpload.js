import formidable from "formidable";
import os from "os";

/**
 * Middleware that optionally parses multipart/form-data.
 * If the request is JSON, it passes through unchanged.
 * If multipart, it parses fields + files and sets req.filesMeta.
 */
export default function optionalUpload(req, res, next) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  const form = formidable({
    multiples: true,
    maxFileSize: 15 * 1024 * 1024, // 15 MB per file
    uploadDir: os.tmpdir(),
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: "File upload failed" });
    }

    const arr = Array.isArray(files.file)
      ? files.file
      : files.file
        ? [files.file]
        : [];

    req.filesMeta = arr.map((f) => ({
      newFilename: f.newFilename,
      originalFilename: f.originalFilename,
      mimetype: f.mimetype,
      size: f.size,
      filepath: f.filepath,
    }));

    // Flatten formidable field arrays to single values
    const flat = {};
    for (const [key, val] of Object.entries(fields)) {
      flat[key] = Array.isArray(val) ? val[0] : val;
    }
    req.body = flat;
    next();
  });
}
