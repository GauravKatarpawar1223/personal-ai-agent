import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Encrypts/decrypts OAuth tokens before they touch the database. Uses
 * Node's built-in crypto module only — no external dependency, no
 * invented cipher. AES-256-GCM: a random 12-byte IV per encryption, the
 * 16-byte auth tag, and the ciphertext are concatenated and base64
 * encoded as a single string for storage.
 *
 * GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key
 * (e.g. generated with `openssl rand -base64 32`). This module only
 * runs on the server — it must never be imported into a Client
 * Component, and the key must never be a NEXT_PUBLIC_* variable.
 */

function getKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not set on the server.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
