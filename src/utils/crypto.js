import crypto from "crypto";

// AES-256-GCM field-level encryption utilities
// Set ENCRYPTION_KEY in env: 32-byte key in base64 or hex; fallback derives from utf8 if 32 chars

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY || "";
  if (!raw) throw new Error("ENCRYPTION_KEY is required for encryption");
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (/^[A-Za-z0-9+/=]{43,44}$/.test(raw)) {
    return Buffer.from(raw, "base64");
  }
  const buf = Buffer.from(raw, "utf8");
  if (buf.length === 32) return buf;
  // Derive to 32 bytes with SHA-256 if arbitrary length string
  return crypto.createHash("sha256").update(buf).digest();
};

export function encryptJson(obj) {
  if (obj == null) return undefined;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // return base64 of iv|ciphertext|tag
  return Buffer.concat([iv, ciphertext, authTag]).toString("base64");
}

export function decryptJson(payload) {
  if (!payload) return undefined;
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 12 + 16) return undefined;
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  try {
    return JSON.parse(plaintext.toString("utf8"));
  } catch {
    return undefined;
  }
}

export function maskAccountNumber(value) {
  if (!value) return "";
  const s = String(value).replace(/\s+/g, "");
  if (s.length <= 4) return s;
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}


