import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";

function getEncryptionKey(): Buffer {
  if (config.TOKEN_ENCRYPTION_KEY_HEX) {
    if (!/^[a-fA-F0-9]{64}$/.test(config.TOKEN_ENCRYPTION_KEY_HEX)) {
      throw new Error("TOKEN_ENCRYPTION_KEY_HEX must be exactly 64 hexadecimal characters.");
    }
    return Buffer.from(config.TOKEN_ENCRYPTION_KEY_HEX, "hex");
  }

  if (config.NODE_ENV === "production") {
    throw new Error("Production token encryption key is not configured.");
  }

  // Development-only key derivation. Production must use a separately managed key.
  return createHash("sha256")
    .update("salesforce-marketing-dev-token-key:")
    .update(config.SESSION_SECRET)
    .digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(sealed: string): string {
  const [ivPart, tagPart, ciphertextPart, extra] = sealed.split(".");
  if (!ivPart || !tagPart || !ciphertextPart || extra !== undefined) {
    throw new Error("Encrypted token has an invalid format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
