import path from "path";
import fs from "fs";
import LoanCollectorDocument from "../models/LoanCollectorDocument.js";
import LoanCollector from "../models/LoanCollector.js";
import { uploadToDrive, moveToTrash } from "../utils/googleDrive.js";

const extractErrorMessage = (e) => {
  // googleapis style
  const g = e?.response?.data?.error?.message;
  if (g) return g;
  // generic Error
  if (e?.message) return e.message;
  try { return JSON.stringify(e); } catch { return "Unknown error"; }
};

const inferTypeFromName = (name = "") => {
  const lower = String(name).toLowerCase();
  if (lower.match(/\.pdf($|\?)/)) return "pdf";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/)) return "image";
  if (lower.match(/\.(doc|docx)($|\?)/)) return "doc";
  if (lower.match(/\.(xls|xlsx)($|\?)/)) return "sheet";
  return "other";
};

const pickCollectorFolders = (mimeType, filename) => {
  const isImage = /^image\//i.test(mimeType) || inferTypeFromName(filename) === "image";
  const imgId = process.env.DRIVE_COLLECTORS_IMAGES_ID || process.env.DRIVE_FOLDER_IMAGES_ID || process.env.DRIVE_FOLDER_ID;
  const docId = process.env.DRIVE_COLLECTORS_DOCS_ID || process.env.DRIVE_FOLDER_DOCS_ID || process.env.DRIVE_FOLDER_ID;
  const folderId = isImage ? imgId : docId;
  const parents = folderId ? [folderId] : undefined;
  return parents;
};

export async function listCollectorDocuments(req, res) {
  try {
    const { id } = req.params; // collectorId
    const docs = await LoanCollectorDocument.find({ collectorId: id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: docs });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

export async function createCollectorLink(req, res) {
  try {
    const { id } = req.params; // collectorId
    const { name, link, type, source, category } = req.body;
    if (!name || !link) return res.status(400).json({ success: false, message: "name and link are required" });

    const collector = await LoanCollector.findById(id).lean();
    const doc = await LoanCollectorDocument.create({
      collectorId: id,
      collectorName: collector?.Name,
      collectorGeneratedId: collector?.GeneratedIDNumber,
      name,
      link,
      type: type || inferTypeFromName(link),
      source: source || (link.includes("drive.google.com") ? "Google Drive" : "External"),
      category: category || "other",
    });
    return res.json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

export async function uploadCollectorDocuments(req, res) {
  try {
    const { id } = req.params; // collectorId
    // Formidable may provide fields as arrays when multiples=true; normalize to first value
    const norm = (v) => (Array.isArray(v) ? v[0] : v);
    const name = norm(req.body?.name);
    const type = norm(req.body?.type);
    const source = norm(req.body?.source);
    const category = norm(req.body?.category);
    const filesMeta = req.filesMeta || (req.fileMeta ? [req.fileMeta] : []);
    if (!filesMeta.length) return res.status(400).json({ success: false, message: "No files received" });

    const collector = await LoanCollector.findById(id).lean();

    const results = [];
    for (const fm of filesMeta) {
      const filename = fm.originalFilename || fm.newFilename;
      const mimeType = fm.mimetype || fm.mimeType;
      const ext = path.extname(filename || "").replace(/^\./, "");

      // Determine folder and upload to Drive
      const parents = pickCollectorFolders(mimeType, filename);
      let up;
      try {
        up = await uploadToDrive({
          filepath: fm.filepath || fm.filepathTemp || fm.filepathOriginal || fm.filepath,
          name: filename,
          mimeType,
          parents,
        });
      } catch (err) {
        const msg = extractErrorMessage(err);
        console.error("Collector upload error:", msg);
        // Common Drive issue: folder ID not shared with the service account
        if (/File not found|insufficientFilePermissions|not found/i.test(msg)) {
          return res.status(500).json({
            success: false,
            message:
              "Drive upload failed: verify the folder ID(s) are correct and shared with the service account. Check DRIVE_COLLECTORS_IMAGES_ID/DRIVE_COLLECTORS_DOCS_ID or fallback IDs.",
          });
        }
        return res.status(500).json({ success: false, message: msg || "Upload failed" });
      }

      const doc = await LoanCollectorDocument.create({
        collectorId: id,
        collectorName: collector?.Name,
        collectorGeneratedId: collector?.GeneratedIDNumber,
        name: name || filename,
        type: type || inferTypeFromName(filename),
        source: source || "upload",
        category: category || (inferTypeFromName(filename) === "image" ? "id" : "requirements"),
        link: up.webViewLink || up.webContentLink,
        url: up.webViewLink || up.webContentLink,
        driveFileId: up.id,
        mimeType,
        size: fm.size,
        ext,
        uploadedBy: req.user?.email || req.user?.name || req.user?._id?.toString?.(),
      });
      results.push(doc);

      // Attempt to unlink temp file
      try { if (fm.filepath && fs.existsSync(fm.filepath)) fs.unlinkSync(fm.filepath); } catch {}
    }

    return res.json({ success: true, data: results });
  } catch (e) {
    const msg = extractErrorMessage(e);
    console.error("Collector documents controller error:", msg);
    return res.status(500).json({ success: false, message: msg });
  }
}

export async function deleteCollectorDocument(req, res) {
  try {
    const { docId } = req.params;
    const doc = await LoanCollectorDocument.findById(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    // Move Drive file to trash if present
    const driveId = doc.driveFileId || (doc.link || "").match(/\/d\/([\w-]+)/)?.[1] || (doc.link || "").match(/id=([\w-]+)/)?.[1];
    if (driveId) {
      try { await moveToTrash(driveId); } catch {}
    }

    await doc.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
