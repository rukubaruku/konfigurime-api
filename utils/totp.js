const crypto = require("crypto");

/*
 * Minimal TOTP implementation (RFC 6238 / RFC 4226): HMAC-SHA1, 6 digits,
 * 30 second step. Compatible with Google Authenticator, Microsoft
 * Authenticator, Authy, 1Password, Bitwarden, etc.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20)); // 160-bit secret
}

function hotp(secretBuffer, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto
    .createHmac("sha1", secretBuffer)
    .update(counterBuffer)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/**
 * Verifies a code against the secret, allowing +/- `window` steps of clock
 * drift. Returns the matched time step (so callers can reject replays), or
 * null when the code is invalid.
 */
function verifyTotp(secret, token, { window = 1, now = Date.now() } = {}) {
  const code = String(token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return null;

  const key = base32Decode(secret);
  const step = currentStep(now);
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(key, step + i);
    if (
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(code))
    ) {
      return step + i;
    }
  }
  return null;
}

function otpauthUrl({ secret, accountName, issuer }) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = {
  base32Encode,
  base32Decode,
  generateSecret,
  hotp,
  verifyTotp,
  otpauthUrl,
};
