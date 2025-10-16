// Simple session-based cache with TTL, using secure storage helpers
import { lsGetSession, lsSetSession } from "./storage";

const CACHE_ROOT = "cache:v1";

function now() {
  return Date.now();
}

export function getCache(key) {
  try {
    const all = lsGetSession(CACHE_ROOT) || {};
    const entry = all[key];
    if (!entry) return null;
    const { value, expiresAt } = entry;
    if (typeof expiresAt === "number" && now() > expiresAt) return null;
    return value;
  } catch {
    return null;
  }
}

export function setCache(key, value, ttlMs = 120000) {
  try {
    const all = lsGetSession(CACHE_ROOT) || {};
    const expiresAt = ttlMs > 0 ? now() + ttlMs : undefined;
    all[key] = { value, expiresAt };
    lsSetSession(CACHE_ROOT, all);
  } catch {}
}

export function delCache(key) {
  try {
    const all = lsGetSession(CACHE_ROOT) || {};
    if (all[key]) {
      delete all[key];
      lsSetSession(CACHE_ROOT, all);
    }
  } catch {}
}

export function clearCache() {
  try {
    lsSetSession(CACHE_ROOT, {});
  } catch {}
}
