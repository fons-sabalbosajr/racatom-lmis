// utils/storage.js
import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_ENCRYPT_SECRET;
const KEY_PREFIX = "__rct__"; // obscure keys in storage

export function encryptData(data) {
  if (data === undefined) return null;
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

export function decryptData(ciphertext) {
  try {
    if (!ciphertext || ciphertext === "null" || ciphertext === "undefined") return null;
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) return null; // corrupted or wrong key
    return JSON.parse(decryptedStr);
  } catch (err) {
    // Silent fail -> return null
    return null;
  }
}

// Derive an obfuscated key name using HMAC-SHA256
function hashKey(name) {
  const h = CryptoJS.HmacSHA256(String(name), SECRET_KEY).toString(CryptoJS.enc.Hex);
  return `${KEY_PREFIX}${h.slice(0, 32)}`; // 32 hex chars
}

// Secure localStorage helpers
export function lsSet(name, value) {
  try {
    const k = hashKey(name);
    const enc = encryptData(value);
    if (enc === null) {
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(k, enc);
    }
  } catch {}
}

export function lsGet(name) {
  try {
    const k = hashKey(name);
    // Prefer sessionStorage (tab/window scoped) first
    const vSession = typeof window !== "undefined" ? window.sessionStorage?.getItem(k) : null;
    const decSession = decryptData(vSession);
    if (decSession !== null) return decSession;

    const v = localStorage.getItem(k);
    const dec = decryptData(v);
    if (dec !== null) return dec;
    // Backward compatibility: try plain key (may be encrypted or plain JSON)
    const legacy = localStorage.getItem(name);
    const legacyDec = decryptData(legacy);
    if (legacyDec !== null) return legacyDec;
    // If legacy was plain JSON
    try {
      return legacy ? JSON.parse(legacy) : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export function lsRemove(name) {
  try {
    const k = hashKey(name);
    localStorage.removeItem(k);
    try { window.sessionStorage?.removeItem(k); } catch {}
    // Also remove legacy
    localStorage.removeItem(name);
  } catch {}
}

// Session-scoped helpers (per tab/window)
export function lsSetSession(name, value) {
  try {
    const k = hashKey(name);
    const enc = encryptData(value);
    if (enc === null) {
      window.sessionStorage?.removeItem(k);
    } else {
      window.sessionStorage?.setItem(k, enc);
    }
  } catch {}
}

export function lsGetSession(name) {
  try {
    const k = hashKey(name);
    const v = typeof window !== "undefined" ? window.sessionStorage?.getItem(k) : null;
    const dec = decryptData(v);
    return dec;
  } catch {
    return null;
  }
}

// One-time migration helper to move known legacy keys to secure keys
export function migrateStorageKeys() {
  const known = ["user", "onlineUser", "devSettings", "token"];
  try {
    for (const n of known) {
      const secureExists = localStorage.getItem(hashKey(n)) != null;
      if (secureExists) continue;
      const raw = localStorage.getItem(n);
      if (raw == null) continue;
      // Try decrypt as legacy-encrypted
      let obj = decryptData(raw);
      if (obj === null) {
        try {
          obj = JSON.parse(raw);
        } catch {
          obj = null;
        }
      }
      if (obj !== null) {
        lsSet(n, obj);
        localStorage.removeItem(n);
      }
    }
  } catch {}
}

// Auto-run migration on import
migrateStorageKeys();

// Clear all app keys: hashed with prefix + known legacy keys
export function lsClearAllApp() {
  try {
    const legacy = ["user", "onlineUser", "devSettings", "token", "rct-lmis:user", "__session_token"]; // include legacy/plain
    // Remove hashed keys with our prefix
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    // Also clear from sessionStorage
    try {
      const toRemoveSession = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(KEY_PREFIX)) toRemoveSession.push(key);
      }
      toRemoveSession.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {}
    // Remove legacy
    legacy.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
      try { window.sessionStorage?.removeItem(k); } catch {}
    });
  } catch {}
}
