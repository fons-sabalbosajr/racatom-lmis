// routes/databaseRoutes.js
import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { developerOnly } from "../middleware/checkPermissions.js";
import mongoose from "mongoose";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import LoanClient from "../models/LoanClient.js";
import LoanCycle from "../models/LoanCycle.js";
import LoanCollection from "../models/LoanCollection.js";
import LoanDocument from "../models/LoanDocument.js";
import LoanDisbursed from "../models/LoanDisbursed.js";
import LoanClientApplication from "../models/LoanClientApplication.js";
import runtimeFlags from "../utils/runtimeFlags.js";

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

// GET /api/database/connection/state
router.get("/connection/state", async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    return res.json({ success: true, state });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get state" });
  }
});

// POST /api/database/connection/disconnect
router.post("/connection/disconnect", async (req, res) => {
  try {
    await mongoose.disconnect();
    return res.json({ success: true, message: "Disconnected" });
  } catch (err) {
    console.error("disconnect error:", err);
    return res.status(500).json({ success: false, message: "Failed to disconnect" });
  }
});

// POST /api/database/connection/connect
router.post("/connection/connect", async (req, res) => {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME;
    await mongoose.connect(uri, { dbName });
    return res.json({ success: true, message: "Connected" });
  } catch (err) {
    console.error("connect error:", err);
    return res.status(500).json({ success: false, message: "Failed to connect" });
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

// ===== Accounts management =====
// GET /api/database/accounts — list core loan accounts (LoanClient), optional search
router.get("/accounts", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = [
        { AccountId: regex },
        { ClientNo: regex },
        { FirstName: regex },
        { MiddleName: regex },
        { LastName: regex },
      ];
    }

    // Paging & limits
    const rawLimit = parseInt(req.query.limit, 10);
    const rawPage = parseInt(req.query.page, 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 5000 : rawLimit, 1), 10000); // default 5000, max 10000
    const page = Math.max(isNaN(rawPage) ? 1 : rawPage, 1);
    const skip = (page - 1) * limit;

    // Query
    const [total, docs] = await Promise.all([
      LoanClient.countDocuments(filter),
      LoanClient.find(filter)
        .select("AccountId ClientNo FirstName MiddleName LastName City Province Barangay createdAt updatedAt")
        .sort({ ClientNo: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const pages = Math.max(Math.ceil(total / limit), 1);
    return res.json({ success: true, accounts: docs, total, page, pages, limit });
  } catch (err) {
    console.error("accounts list error:", err);
    return res.status(500).json({ success: false, message: "Failed to list accounts" });
  }
});

// DELETE /api/database/account/:accountId — cascade delete across related collections
router.delete("/account/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    if (!accountId) return res.status(400).json({ success: false, message: "accountId required" });

    // collect delete results
    const results = {};
    const lc = await LoanClient.deleteOne({ AccountId: accountId });
    results.LoanClient = lc.deletedCount || 0;
    const cycles = await LoanCycle.deleteMany({ AccountId: accountId });
    results.LoanCycle = cycles.deletedCount || 0;
    const col = await LoanCollection.deleteMany({ AccountId: accountId });
    results.LoanCollection = col.deletedCount || 0;
    const docs = await LoanDocument.deleteMany({ AccountId: accountId });
    results.LoanDocument = docs.deletedCount || 0;
    const disb = await LoanDisbursed.deleteMany({ AccountId: accountId });
    results.LoanDisbursed = disb.deletedCount || 0;
    const apps = await LoanClientApplication.deleteMany({ AccountId: accountId });
    results.LoanClientApplication = apps.deletedCount || 0;

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);
    return res.json({ success: true, totalDeleted, results });
  } catch (err) {
    console.error("cascade delete error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete account" });
  }
});

// ===== Maintenance mode =====
// GET current maintenance flag
router.get("/maintenance", (req, res) => {
  return res.json({ success: true, maintenance: runtimeFlags.maintenance });
});

// POST set maintenance flag { maintenance: boolean }
router.post("/maintenance", (req, res) => {
  const { maintenance } = req.body || {};
  if (typeof maintenance !== "boolean") {
    return res.status(400).json({ success: false, message: "maintenance boolean required" });
  }
  runtimeFlags.maintenance = maintenance;
  return res.json({ success: true, maintenance });
});

export default router;
 
// ==============================================
// Resequence AccountId and ClientNo for a year
// POST /api/database/resequence-accounts
// Body: { year: number|string, dryRun?: boolean }
// - Rebuilds ClientNo as RCT-<year>-CL0001..N
// - Rebuilds AccountId as RCT-<year>DB-0001..N
// - Propagates changes to LoanCycle, LoanCollection, LoanDocument, LoanDisbursed, LoanClientApplication
// - Uses a two-phase update to avoid unique collisions on LoanClient
router.post("/resequence-accounts", async (req, res) => {
  const { year, dryRun: dryRunInput } = req.body || {};
  const dryRun = dryRunInput !== false; // default true

  try {
    const yearStr = String(year || "").trim();
    if (!/^\d{4}$/.test(yearStr)) {
      return res.status(400).json({ success: false, message: "year (YYYY) is required" });
    }

    const clientPrefix = `RCT-${yearStr}-CL`;
    const acctPrefix = `RCT-${yearStr}DB-`;

    // Fetch all clients for the given year, order by ClientNo ascending (string sort ok within same prefix)
    const clients = await LoanClient.find({ ClientNo: { $regex: `^${clientPrefix}` } })
      .select("_id AccountId ClientNo FirstName LastName")
      .sort({ ClientNo: 1 })
      .lean();

    if (!clients.length) {
      return res.json({ success: true, message: `No clients found for year ${yearStr}`, changes: [] });
    }

    // Build mapping old -> new
    const changes = [];
    let counter = 1;
    for (const c of clients) {
      const newClientNo = `${clientPrefix}${String(counter).padStart(4, "0")}`;
      const newAccountId = `${acctPrefix}${String(counter).padStart(4, "0")}`;

      const needsChange = c.ClientNo !== newClientNo || c.AccountId !== newAccountId;
      if (needsChange) {
        changes.push({
          _id: c._id,
          old: { AccountId: c.AccountId, ClientNo: c.ClientNo },
          next: { AccountId: newAccountId, ClientNo: newClientNo },
        });
      }
      counter += 1;
    }

    if (!changes.length) {
      return res.json({ success: true, message: "Already sequential; no changes needed", changes: [] });
    }

    // If dry-run, just return the plan
    if (dryRun) {
      return res.json({ success: true, dryRun: true, count: changes.length, sample: changes.slice(0, 10) });
    }

    // Phase A: Update LoanClient to temporary unique values to avoid unique collisions
    for (const ch of changes) {
      const tmpAcct = `${ch.next.AccountId}__TMP`;
      const tmpClient = `${ch.next.ClientNo}__TMP`;
      await LoanClient.updateOne({ _id: ch._id }, { $set: { AccountId: tmpAcct, ClientNo: tmpClient } });
    }

    // Phase B: For each mapping, set LoanClient to final values and propagate to related collections
    let updatedClients = 0;
    let updatedCycles = 0;
    let updatedCollections = 0;
    let updatedDocs = 0;
    let updatedDisbursed = 0;
    let updatedApps = 0;

    for (const ch of changes) {
      // Update main client to final values (from TMP)
      await LoanClient.updateOne(
        { _id: ch._id },
        { $set: { AccountId: ch.next.AccountId, ClientNo: ch.next.ClientNo } }
      );
      updatedClients += 1;

      // Propagate across related collections based on OLD values
      const { AccountId: oldAcct, ClientNo: oldClient } = ch.old;
      const { AccountId: newAcct, ClientNo: newClient } = ch.next;

      const cycleRes = await LoanCycle.updateMany(
        { $or: [{ AccountId: oldAcct }, { ClientNo: oldClient }] },
        { $set: { AccountId: newAcct, ClientNo: newClient } }
      );
      updatedCycles += cycleRes.modifiedCount || 0;

      const colRes = await LoanCollection.updateMany(
        { $or: [{ AccountId: oldAcct }, { ClientNo: oldClient }] },
        { $set: { AccountId: newAcct, ClientNo: newClient } }
      );
      updatedCollections += colRes.modifiedCount || 0;

      const docRes = await LoanDocument.updateMany(
        { $or: [{ AccountId: oldAcct }, { ClientNo: oldClient }] },
        { $set: { AccountId: newAcct, ClientNo: newClient } }
      );
      updatedDocs += docRes.modifiedCount || 0;

      const disbRes = await LoanDisbursed.updateMany(
        { $or: [{ AccountId: oldAcct }, { ClientNo: oldClient }] },
        { $set: { AccountId: newAcct, ClientNo: newClient } }
      );
      updatedDisbursed += disbRes.modifiedCount || 0;

      const appRes = await LoanClientApplication.updateMany(
        { AccountId: oldAcct },
        { $set: { AccountId: newAcct } }
      );
      updatedApps += appRes.modifiedCount || 0;
    }

    return res.json({
      success: true,
      message: `Resequenced ${updatedClients} clients for ${yearStr}`,
      updated: {
        clients: updatedClients,
        cycles: updatedCycles,
        collections: updatedCollections,
        documents: updatedDocs,
        disbursed: updatedDisbursed,
        applications: updatedApps,
      },
    });
  } catch (err) {
    console.error("resequence-accounts error:", err);
    return res.status(500).json({ success: false, message: "Resequence failed" });
  }
});
