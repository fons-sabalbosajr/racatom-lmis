#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ override: true });

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { uploadToDrive } from "../utils/googleDrive.js";
import LoanDocument from "../models/LoanDocument.js";

const root = process.cwd();
const uploadsBase = path.join(root, "uploads", "loan-documents");

const arg = (name, defVal) => {
  const idx = process.argv.findIndex((a) => a === name || a.startsWith(name + "="));
  if (idx === -1) return defVal;
  const eq = process.argv[idx].indexOf("=");
  return eq > -1 ? process.argv[idx].slice(eq + 1) : true;
};

async function main() {
  const dryRun = arg("--dry", false);
  const limit = Number(arg("--limit", 0));
  const skipExisting = arg("--skip-existing", true) !== "false"; // default true

  const hasDriveFolders = Boolean(
    (process.env.DRIVE_FOLDER_IMAGES_ID && process.env.DRIVE_FOLDER_IMAGES_ID.trim()) ||
    (process.env.DRIVE_FOLDER_DOCS_ID && process.env.DRIVE_FOLDER_DOCS_ID.trim()) ||
    (process.env.DRIVE_FOLDER_ID && process.env.DRIVE_FOLDER_ID.trim())
  );
  if (!hasDriveFolders) {
    console.error("Drive folders not configured. Set DRIVE_FOLDER_* in .env.");
    process.exit(1);
  }

  if (!fs.existsSync(uploadsBase)) {
    console.log("No local uploads folder to migrate:", uploadsBase);
    process.exit(0);
  }

  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);

  // Find candidates: docs with storagePath or url set, without Google Drive link
  const query = { $or: [{ storagePath: { $exists: true, $ne: null } }, { url: { $regex: "^/uploads/" } }] };
  const total = await LoanDocument.countDocuments(query);
  console.log(`Found ${total} candidate documents to migrate`);
  const cursor = LoanDocument.find(query).cursor();

  let processed = 0;
  for await (const doc of cursor) {
    if (limit && processed >= limit) break;

    if (skipExisting && doc.link && doc.source === "Google Drive") {
      continue; // already migrated
    }

    const localPath = doc.storagePath || (doc.url ? path.join(root, doc.url.replace(/^\//, "")) : null);
    if (!localPath || !fs.existsSync(localPath)) {
      console.warn("Skipping missing local file for doc", doc._id?.toString(), localPath);
      continue;
    }

    const name = doc.name || path.basename(localPath);
    const mimeType = doc.mimeType || undefined;
    const ext = path.extname(localPath).toLowerCase();
    const isImage = (mimeType || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
    const parents = (() => {
      const imgId = (process.env.DRIVE_FOLDER_IMAGES_ID || "").trim();
      const docId = (process.env.DRIVE_FOLDER_DOCS_ID || "").trim();
      const generic = (process.env.DRIVE_FOLDER_ID || "").trim();
      const target = isImage ? (imgId || generic) : (docId || generic);
      return target ? target.split(",").map((s) => s.trim()).filter(Boolean) : [];
    })();

    console.log("Uploading to Drive:", name, "from", localPath);
    if (dryRun) {
      processed++;
      continue;
    }

    try {
      const res = await uploadToDrive({ filepath: localPath, name, mimeType, parents });
      const link = res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`;
      doc.link = link;
      doc.source = "Google Drive";
      // Clear local fields
      doc.url = undefined;
      // Keep storagePath for now; or clear it if we intend to delete local files
      if (arg("--delete-local", false)) {
        try { fs.unlinkSync(localPath); } catch {}
        doc.storagePath = undefined;
      }
      await doc.save();
      processed++;
    } catch (e) {
      console.error("Failed to upload", name, e.message);
    }
  }

  console.log(`Processed ${processed} documents`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
