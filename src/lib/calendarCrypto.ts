import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for secrets the server must read back (the calendar link).
// Stored form: "v1.<iv>.<tag>.<ciphertext>", each part base64url.

function getKey(): Buffer | null {
  const raw = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) throw new Error("CALENDAR_ENCRYPTION_KEY is not set (or is not 32 bytes of base64)");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(stored: string): string {
  const key = getKey();
  if (!key) throw new Error("CALENDAR_ENCRYPTION_KEY is not set (or is not 32 bytes of base64)");
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unrecognized secret format");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
