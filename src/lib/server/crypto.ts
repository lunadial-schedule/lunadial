/**
 * 문자열 암호화/복호화 유틸 (서버 전용)
 *
 * AES-256-GCM 알고리즘으로 민감한 데이터(예: 치지직 토큰)를 암호화/복호화한다.
 * 환경변수 ENCRYPTION_KEY (최소 32자)가 필요하다.
 *
 * 암호화 결과 형식: "iv:authTag:encryptedText" (모두 base64 인코딩)
 */
import crypto from "crypto"

/** 암호화 알고리즘 */
const ALGORITHM = "aes-256-gcm"
/** AES-256은 32바이트 키가 필요 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("Missing ENCRYPTION_KEY environment variable")
  }
  
  // SHA-256 해시를 사용하여 문자열 길이에 관계없이 항상 고정된 32바이트 키 생성
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * 평문 문자열을 AES-256-GCM으로 암호화한다.
 * @param text - 암호화할 평문
 * @returns "iv:authTag:encryptedText" 형태의 암호화 문자열
 */
export function encryptString(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "base64")
  encrypted += cipher.final("base64")
  
  const authTag = cipher.getAuthTag().toString("base64")
  
  return `${iv.toString("base64")}:${authTag}:${encrypted}`
}

/**
 * AES-256-GCM으로 암호화된 문자열을 복호화한다.
 * @param encryptedData - "iv:authTag:encryptedText" 형태의 암호화 문자열
 * @returns 복호화된 평문 문자열
 */
export function decryptString(encryptedData: string): string {
  const key = getEncryptionKey()
  
  const parts = encryptedData.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format")
  }
  
  const iv = Buffer.from(parts[0], "base64")
  const authTag = Buffer.from(parts[1], "base64")
  const encryptedText = parts[2]
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText, "base64", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}
