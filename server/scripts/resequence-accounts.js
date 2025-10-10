// scripts/resequence-accounts.js
// Standalone resequencer for AccountId and ClientNo by year.
// Usage:
//  node scripts/resequence-accounts.js --year=2024            # dry-run (default)
//  node scripts/resequence-accounts.js --year=2024 --apply    # apply changes

import dotenv from "dotenv";
dotenv.config({ override: true });

import mongoose from "mongoose";
import LoanClient from "../models/LoanClient.js";
import LoanCycle from "../models/LoanCycle.js";
import LoanCollection from "../models/LoanCollection.js";
import LoanDocument from "../models/LoanDocument.js";
import LoanDisbursed from "../models/LoanDisbursed.js";
import LoanClientApplication from "../models/LoanClientApplication.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { apply: false };
  for (const a of args) {
    if (a === "--apply") out.apply = true;
    else if (a.startsWith("--year=")) out.year = a.split("=")[1];
    else if (a === "--year" || a === "-y") {
      const idx = args.indexOf(a);
      if (idx >= 0 && args[idx + 1]) out.year = args[idx + 1];
    }
  }
  return out;
}

async function main() {
  const { year, apply } = parseArgs();
  const yearStr = String(year || "").trim();
  if (!/^\d{4}$/.test(yearStr)) {
    console.error("ERROR: Provide --year=YYYY (e.g., 2024)");
    process.exit(2);
  }

  const uri = process.env.MONGO_URI;
  let dbName = process.env.MONGO_DB_NAME;
  if (!uri) {
    console.error("ERROR: MONGO_URI not set in environment");
    process.exit(2);
  }

  // Derive dbName from URI path if not explicitly provided
  if (!dbName) {
    try {
      const u = new URL(uri);
      // pathname starts with '/'
      const path = (u.pathname || "").replace(/^\//, "");
      if (path) dbName = path.split("/")[0];
    } catch {
      // ignore parse errors
    }
  }

  if (dbName) {
    await mongoose.connect(uri, { dbName });
  } else {
    await mongoose.connect(uri);
  }
  console.log(`Connected to MongoDB${dbName ? ` db=${dbName}` : ""}`);

  try {
    const clientPrefix = `RCT-${yearStr}-CL`;
    const acctPrefix = `RCT-${yearStr}DB-`;

    // Fetch ordered list of clients for this year
    const clients = await LoanClient.find({ ClientNo: { $regex: `^${clientPrefix}` } })
      .select("_id AccountId ClientNo FirstName LastName")
      .sort({ ClientNo: 1 })
      .lean();

    if (!clients.length) {
      console.log(`No clients found for year ${yearStr}. Nothing to do.`);
      return;
    }

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
      console.log("Already sequential; no changes needed.");
      return;
    }

    if (!apply) {
      console.log(`DRY-RUN: Would resequence ${changes.length} clients for ${yearStr}.`);
      const sample = changes.slice(0, 10).map((c) => ({
        AccountId_old: c.old.AccountId,
        ClientNo_old: c.old.ClientNo,
        AccountId_new: c.next.AccountId,
        ClientNo_new: c.next.ClientNo,
      }));
      console.table(sample);
      return;
    }

    console.log(`Applying resequence for ${changes.length} clients in ${yearStr}...`);

    // Phase A: temporary unique values on LoanClient to avoid collisions
    for (const ch of changes) {
      const tmpAcct = `${ch.next.AccountId}__TMP`;
      const tmpClient = `${ch.next.ClientNo}__TMP`;
      await LoanClient.updateOne({ _id: ch._id }, { $set: { AccountId: tmpAcct, ClientNo: tmpClient } });
    }

    // Phase B: apply final values and propagate
    let updatedClients = 0;
    let updatedCycles = 0;
    let updatedCollections = 0;
    let updatedDocs = 0;
    let updatedDisbursed = 0;
    let updatedApps = 0;

    for (const ch of changes) {
      await LoanClient.updateOne(
        { _id: ch._id },
        { $set: { AccountId: ch.next.AccountId, ClientNo: ch.next.ClientNo } }
      );
      updatedClients += 1;

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

    console.log("Resequence complete:");
    console.log({
      clients: updatedClients,
      cycles: updatedCycles,
      collections: updatedCollections,
      documents: updatedDocs,
      disbursed: updatedDisbursed,
      applications: updatedApps,
    });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Resequence failed:", err);
  process.exit(1);
});
