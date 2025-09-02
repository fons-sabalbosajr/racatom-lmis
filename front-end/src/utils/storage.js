// utils/storage.js
import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_ENCRYPT_SECRET;

export function encryptData(data) {
  if (!data) return null;
  return CryptoJS.AES.encrypt(
    JSON.stringify(data),
    SECRET_KEY
  ).toString();
}

export function decryptData(ciphertext) {
  try {
    if (!ciphertext || ciphertext === "null" || ciphertext === "undefined") {
      return null;
    }

    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedStr) return null; // corrupted or wrong key

    return JSON.parse(decryptedStr);
  } catch (err) {
    console.error("Decryption error:", err);
    return null;
  }
}
