/*
 * One-off migration:
 *   - credentials.password: legacy AES-256-CBC (or old key) -> AES-256-GCM
 *   - commands.code:        plain text (or old key)         -> AES-256-GCM
 *   - users.twoFactorSecret: old key                        -> current key
 *
 * Safe to run several times; records already encrypted with the current key
 * are skipped. Uses the raw MongoDB driver so Mongoose setters/hooks do not
 * interfere.
 *
 * Usage:
 *   NODE_ENV=production node scripts/migrate-encryption.js            # dry run
 *   NODE_ENV=production node scripts/migrate-encryption.js --apply
 *
 * Key rotation: put the new key in VAULT_SECRET and the previous one in
 * VAULT_SECRET_OLD, run with --apply, then remove VAULT_SECRET_OLD.
 *
 * TAKE A DATABASE BACKUP (mongodump) BEFORE RUNNING WITH --apply.
 */
const path = require("path");
require("dotenv").config({
  path: path.join(
    __dirname,
    "..",
    `.env.${process.env.NODE_ENV || "development"}`,
  ),
});

const crypto = require("crypto");
const mongoose = require("mongoose");
const {
  encrypt,
  decrypt,
  isEncrypted,
  isLegacyEncrypted,
} = require("../utils/crypto");

const APPLY = process.argv.includes("--apply");
const currentKey = crypto
  .createHash("sha256")
  .update(process.env.VAULT_SECRET)
  .digest();

// True when the value is v2 AND decrypts with the *current* key.
function isCurrent(value) {
  if (!isEncrypted(value)) return false;
  try {
    const [ivHex, tagHex, dataHex] = value.slice("enc:v2:".length).split(":");
    const d = crypto.createDecipheriv(
      "aes-256-gcm",
      currentKey,
      Buffer.from(ivHex, "hex"),
    );
    d.setAuthTag(Buffer.from(tagHex, "hex"));
    d.update(Buffer.from(dataHex, "hex"));
    d.final();
    return true;
  } catch {
    return false;
  }
}

function reencrypt(plain) {
  // encrypt() refuses to double-encrypt values that look encrypted, so build
  // the ciphertext from the decrypted plain text.
  return encrypt(plain);
}

async function migrateCollection(name, field, { legacyCbc }) {
  const col = mongoose.connection.db.collection(name);
  const cursor = col.find({ [field]: { $type: "string", $ne: "" } });

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const doc of cursor) {
    const value = doc[field];
    if (isCurrent(value)) {
      skipped++;
      continue;
    }

    let plain;
    try {
      if (isEncrypted(value) || (legacyCbc && isLegacyEncrypted(value))) {
        plain = decrypt(value); // tries VAULT_SECRET then VAULT_SECRET_OLD
      } else if (legacyCbc) {
        // A credential password that is not in any known encrypted format.
        console.warn(`  ${name} ${doc._id}: unknown format, left untouched`);
        failed++;
        continue;
      } else {
        plain = value; // plain-text command
      }
    } catch (err) {
      console.error(`  ${name} ${doc._id}: cannot decrypt (${err.message})`);
      failed++;
      continue;
    }

    const next = reencrypt(plain);
    if (decrypt(next) !== plain) {
      console.error(`  ${name} ${doc._id}: round-trip check failed, skipped`);
      failed++;
      continue;
    }

    if (APPLY) {
      await col.updateOne({ _id: doc._id }, { $set: { [field]: next } });
    }
    migrated++;
  }

  console.log(
    `${name}.${field}: ${migrated} ${APPLY ? "migrated" : "to migrate"}, ` +
      `${skipped} already current, ${failed} failed`,
  );
  return failed;
}

(async () => {
  await mongoose.connect(process.env.DB_MONGODB_URI);
  console.log(APPLY ? "APPLYING changes" : "DRY RUN (use --apply to write)");

  let failed = 0;
  failed += await migrateCollection("credentials", "password", {
    legacyCbc: true,
  });
  failed += await migrateCollection("commands", "code", { legacyCbc: false });
  failed += await migrateCollection("users", "twoFactorSecret", {
    legacyCbc: false,
  });

  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
