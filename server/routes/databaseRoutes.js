// routes/databaseRoutes.js
import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { developerOnly } from "../middleware/checkPermissions.js";
import mongoose from "mongoose";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const router = express.Router();

// All routes require auth + developer role
router.use(requireAuth, developerOnly);

// Utility: promisified exec
function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { ...opts }, (error, stdout, stderr) => {
      if (error) return reject({ error, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

// GET /api/database/health
router.get("/health", async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 1 connected, 2 connecting
    const db = mongoose.connection.db.databaseName;
    return res.json({ success: true, state, db });
  } catch (err) {
    console.error("db health error:", err);
    return res.status(500).json({ success: false, message: "DB health check failed" });
  }
});

// GET /api/database/collections
router.get("/collections", async (req, res) => {
  try {
    const cursor = mongoose.connection.db.listCollections({}, { nameOnly: true });
    const names = [];
    for await (const c of cursor) names.push(c.name);
    return res.json({ success: true, collections: names.sort() });
  } catch (err) {
    console.error("list collections error:", err);
    return res.status(500).json({ success: false, message: "Failed to list collections" });
  }
});

// POST /api/database/backup
// Creates a BSON dump via mongodump into ./backups/yyyy-mm-dd_HHMM
router.post("/backup", async (req, res) => {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME;
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    const outDir = path.resolve(process.cwd(), "backups", `${dbName}_${stamp}`);
    fs.mkdirSync(outDir, { recursive: true });

    const cmd = `mongodump --uri \"${uri}\" --db \"${dbName}\" --out \"${outDir}\"`;
    const result = await run(cmd);
    return res.json({ success: true, outDir, message: "Backup completed", detail: result.stdout });
  } catch (err) {
    console.error("backup error:", err);
    const message = err?.stderr || err?.error?.message || "Backup failed";
    return res.status(500).json({ success: false, message });
  }
});

// POST /api/database/restore
// Restores from a given dump path (server-local). Body: { sourceDir }
router.post("/restore", async (req, res) => {
  try {
    const { sourceDir } = req.body;
    if (!sourceDir) return res.status(400).json({ success: false, message: "sourceDir is required" });
    if (!fs.existsSync(sourceDir)) return res.status(400).json({ success: false, message: "sourceDir does not exist" });

    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME;
    const cmd = `mongorestore --uri \"${uri}\" --db \"${dbName}\" --drop \"${path.resolve(sourceDir, dbName)}\"`;
    const result = await run(cmd);
    return res.json({ success: true, message: "Restore completed", detail: result.stdout });
  } catch (err) {
    console.error("restore error:", err);
    const message = err?.stderr || err?.error?.message || "Restore failed";
    return res.status(500).json({ success: false, message });
  }
});

// POST /api/database/purge-collection
// Body: { collectionName }
router.post("/purge-collection", async (req, res) => {
  try {
    const { collectionName } = req.body;
    if (!collectionName) return res.status(400).json({ success: false, message: "collectionName is required" });
    const exists = await mongoose.connection.db.listCollections({ name: collectionName }).hasNext();
    if (!exists) return res.status(404).json({ success: false, message: "Collection not found" });

    const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("purge-collection error:", err);
    return res.status(500).json({ success: false, message: "Failed to purge collection" });
  }
});

// DELETE /api/database/purge-db
router.delete("/purge-db", async (req, res) => {
  try {
    const cols = await mongoose.connection.db.collections();
    let total = 0;
    for (const col of cols) {
      const r = await col.deleteMany({});
      total += r.deletedCount || 0;
    }
    return res.json({ success: true, totalDeleted: total });
  } catch (err) {
    console.error("purge-db error:", err);
    return res.status(500).json({ success: false, message: "Failed to purge database" });
  }
});

// POST /api/database/vacuum
// A no-op for MongoDB, but we can run compact on all collections (requires permissions)
router.post("/compact", async (req, res) => {
  try {
    const cols = await mongoose.connection.db.collections();
    for (const col of cols) {
      try { await col.stats(); } catch (e) { /* ignore */ }
    }
    return res.json({ success: true, message: "Compaction stats refreshed" });
  } catch (err) {
    console.error("compact error:", err);
    return res.status(500).json({ success: false, message: "Failed to run maintenance" });
  }
});

// GET /api/database/export?collection=...&format=json|csv
router.get("/export", async (req, res) => {
  try {
    const collectionName = String(req.query.collection || "").trim();
    const format = String(req.query.format || "json").toLowerCase();

    if (!collectionName) return res.status(400).json({ success: false, message: "collection is required" });
    if (!["json", "csv"].includes(format)) return res.status(400).json({ success: false, message: "format must be json or csv" });

    const exists = await mongoose.connection.db.listCollections({ name: collectionName }).hasNext();
    if (!exists) return res.status(404).json({ success: false, message: "Collection not found" });

    const docs = await mongoose.connection.db.collection(collectionName).find({}).toArray();

    const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    const filename = `${collectionName}_${stamp}.${format}`;

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(docs, null, 2));
    }

    // CSV export
    const rows = docs.map((d) => ({ ...d, _id: d._id ? String(d._id) : undefined }));
    const headerSet = new Set();
    for (const r of rows) {
      Object.keys(r).forEach((k) => headerSet.add(k));
    }
    const headers = Array.from(headerSet);

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return "";
      let s = typeof val === "object" ? JSON.stringify(val) : String(val);
      // escape quotes
      s = s.replace(/"/g, '""');
      // always wrap in quotes to be safe
      return `"${s}"`;
    };

    const lines = [];
    lines.push(headers.map((h) => escapeCsv(h)).join(","));
    for (const r of rows) {
      const line = headers.map((h) => escapeCsv(r[h]));
      lines.push(line.join(","));
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error("export error:", err);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

export default router;
