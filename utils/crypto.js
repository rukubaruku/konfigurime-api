const crypto = require("crypto");

const algorithm = "aes-256-cbc";
const secret = process.env.VAULT_SECRET;

if (!secret) {
  throw new Error("VAULT_SECRET is not defined in your environment!");
}

const key = crypto.createHash("sha256").update(secret).digest();
const ivLength = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
