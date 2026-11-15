const crypto = require("crypto");

/*
 * Field encryption for sensitive data (credential passwords, command code,
 * 2FA secrets).
 *
 * Current format (authenticated, tamper-evident):
 *   enc:v2:<iv hex>:<auth tag hex>:<ciphertext hex>      AES-256-GCM
 *
 * Legacy format (still readable, re-encrypted by scripts/migrate-encryption.js):
 *   <iv hex>:<ciphertext hex>                             AES-256-CBC
 *
 * The key is derived from VAULT_SECRET. To rotate the key, set the new value
 * in VAULT_SECRET and the old one in VAULT_SECRET_OLD, run the migration
 * script, then remove VAULT_SECRET_OLD.
 */

const PREFIX = "enc:v2:";
const GCM_IV_LENGTH = 12;

if (!process.env.VAULT_SECRET) {
  throw new Error("VAULT_SECRET is not defined in your environment!");
}

const deriveKey = (secret) =>
  crypto.createHash("sha256").update(secret).digest();

const currentKey = deriveKey(process.env.VAULT_SECRET);
const oldKey = process.env.VAULT_SECRET_OLD
  ? deriveKey(process.env.VAULT_SECRET_OLD)
  : null;

const decryptionKeys = oldKey ? [currentKey, oldKey] : [currentKey];

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function isLegacyEncrypted(value) {
  return typeof value === "string" && /^[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}

function encrypt(text) {
  if (text === undefined || text === null || text === "") return text;
  if (isEncrypted(text)) return text; // never double-encrypt

  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", currentKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptGcm(value, key) {
  const [ivHex, tagHex, dataHex] = value.slice(PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function decryptLegacyCbc(value, key) {
  const [ivHex, dataHex] = value.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(ivHex, "hex"),
  );
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function tryKeys(fn, value) {
  let lastError;
  for (const key of decryptionKeys) {
    try {
      return fn(value, key);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Decrypts a value produced by encrypt() (or the legacy CBC format).
 * Plain, unencrypted values are returned unchanged, so data written before
 * encryption was introduced keeps working until it is migrated.
 */
function decrypt(value) {
  if (value === undefined || value === null || value === "") return value;
  if (isEncrypted(value)) return tryKeys(decryptGcm, value);
  if (isLegacyEncrypted(value)) return tryKeys(decryptLegacyCbc, value);
  return value;
}

/**
 * Mongoose getter: never crash a whole listing because one field is bad.
 * With { legacy: false } only the v2 format is decrypted; anything else is
 * treated as not-yet-migrated plain text (used for fields that were never
 * CBC-encrypted, such as command code).
 */
function safeDecrypt(value, { legacy = true } = {}) {
  try {
    if (!legacy && !isEncrypted(value)) return value;
    return decrypt(value);
  } catch (err) {
    console.error("Field decryption failed:", err.message);
    return "";
  }
}

module.exports = {
  encrypt,
  decrypt,
  safeDecrypt,
  isEncrypted,
  isLegacyEncrypted,
};
