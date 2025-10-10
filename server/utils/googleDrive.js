import fs from "fs";
import path from "path";
import { google } from "googleapis";

function buildAuth() {
  const keyFileEnv = process.env.DRIVE_KEY_FILE;
  const base64 = process.env.DRIVE_SA_KEY_BASE64;
  const jsonInline = process.env.DRIVE_SERVICE_ACCOUNT_JSON;

  const tryPaths = [
    path.join(process.cwd(), "secrets", "google_drive_credentials.json"),
    path.join(process.cwd(), "secrets", "rct-credentials.json"),
    // Support running from repo root accidentally
    path.join(process.cwd(), "server", "secrets", "google_drive_credentials.json"),
    path.join(process.cwd(), "server", "secrets", "rct-credentials.json"),
  ];

  const loadJson = (p) => {
    try {
      if (!p) return null;
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const parseJson = (s, from) => {
    try { return JSON.parse(s); } catch { throw new Error(`Invalid ${from}; cannot parse JSON`); }
  };
  const parseBase64 = (b64) => {
    try { return JSON.parse(Buffer.from(b64, "base64").toString("utf-8")); }
    catch { throw new Error("Invalid DRIVE_SA_KEY_BASE64; cannot parse JSON"); }
  };
  const isValidSA = (obj) => obj && obj.client_email && obj.private_key;

  // Build credential object with precedence: env file -> base64 -> inline -> secrets fallback
  let credentials = null;

  if (keyFileEnv && fs.existsSync(keyFileEnv)) {
    const j = loadJson(keyFileEnv);
    if (isValidSA(j)) credentials = j;
  }
  if (!credentials && base64) {
    const j = parseBase64(base64);
    if (isValidSA(j)) credentials = j;
  }
  if (!credentials && jsonInline) {
    const j = parseJson(jsonInline, "DRIVE_SERVICE_ACCOUNT_JSON");
    if (isValidSA(j)) credentials = j;
  }
  if (!credentials) {
    for (const p of tryPaths) {
      if (!fs.existsSync(p)) continue;
      const j = loadJson(p);
      if (isValidSA(j)) { credentials = j; break; }
    }
  }

  if (!credentials) {
    throw new Error("Google Drive service account credentials not found or invalid (missing client_email/private_key)");
  }

  const scopes = ["https://www.googleapis.com/auth/drive"];
  return new google.auth.GoogleAuth({ credentials, scopes });
}

export async function uploadToDrive({ filepath, name, mimeType, parents }) {
  const auth = buildAuth();
  if (!auth) throw new Error("Google Drive auth not configured");
  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name,
    parents: parents && parents.length ? parents : undefined,
  };

  const media = { mimeType, body: fs.createReadStream(filepath) };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, mimeType, webViewLink, webContentLink, parents",
  });
  const file = createRes.data;

  // Optionally make public readable
  if (String(process.env.DRIVE_SHARE_PUBLIC).toLowerCase() === "true") {
    try {
      await drive.permissions.create({
        fileId: file.id,
        requestBody: { role: "reader", type: "anyone" },
      });
      const permGet = await drive.files.get({
        fileId: file.id,
        fields: "webViewLink, webContentLink, id",
      });
      file.webViewLink = permGet.data.webViewLink || file.webViewLink;
      file.webContentLink = permGet.data.webContentLink || file.webContentLink;
    } catch (e) {
      // ignore sharing errors; file still uploaded
    }
  }

  return {
    id: file.id,
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
  };
}

export async function deleteFromDrive(fileId) {
  const auth = buildAuth();
  if (!auth) throw new Error("Google Drive auth not configured");
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({ fileId });
}

export async function moveToTrash(fileId) {
  const auth = buildAuth();
  if (!auth) throw new Error("Google Drive auth not configured");
  const drive = google.drive({ version: "v3", auth });
  await drive.files.update({ fileId, requestBody: { trashed: true } });
}
