import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
// 32 byte key needed for aes-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

export function encryptString(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("Invalid or missing ENCRYPTION_KEY (must be at least 32 characters)")
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  
  let encrypted = cipher.update(text, "utf8", "base64")
  encrypted += cipher.final("base64")
  
  const authTag = cipher.getAuthTag().toString("base64")
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString("base64")}:${authTag}:${encrypted}`
}

export function decryptString(encryptedData: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("Invalid or missing ENCRYPTION_KEY (must be at least 32 characters)")
  }
  
  const parts = encryptedData.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format")
  }
  
  const iv = Buffer.from(parts[0], "base64")
  const authTag = Buffer.from(parts[1], "base64")
  const encryptedText = parts[2]
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText, "base64", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}
