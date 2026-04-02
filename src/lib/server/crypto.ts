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
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) throw new Error("Missing ENCRYPTION_KEY");

  const parts = encryptedData.split(":")
  if (parts.length !== 3) {
    throw new Error("FORMAT_ERROR: 암호문 포맷이 올바르지 않습니다.");
  }
  
  const iv = Buffer.from(parts[0], "base64")
  const authTag = Buffer.from(parts[1], "base64")
  const encryptedText = parts[2]
  
  // 다양한 로컬/운영 환경 차이(Env 파서가 $B를 삭제하는 등)와 레거시 방식을 모두 포괄하기 위한 후보 키 목록
  const candidateKeys = [
    // 1. 현재 표준 방식 (Next.js 환경에서 파싱된 keyStr 기준 해시)
    crypto.createHash('sha256').update(keyStr).digest(),
    // 2. 만약 현재 로컬 Dev가 '$B'를 증발시켰다면, 원래의 32글자 Vercel Production 환경 변수로 복구한 해시 (강력한 유력 후보)
    crypto.createHash('sha256').update(keyStr.replace('v9y&E', 'v9y$B&E')).digest(),
    // 3. 레거시 1: 단순 버퍼 할당
    Buffer.alloc(32, keyStr),
    // 4. 레거시 2: 자르기 또는 패딩
    Buffer.from(keyStr.padEnd(32, '0')).subarray(0, 32),
    // 5. 레거시 3: 해시 없이 직접 파싱 시도 (길이가 32인 경우만)
    keyStr.length === 32 ? Buffer.from(keyStr, 'utf8') : crypto.createHash('sha256').update(keyStr).digest()
  ];

  let lastError: any;
  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(encryptedText, "base64", "utf8")
      decrypted += decipher.final("utf8")
      return decrypted
    } catch (e: any) {
      lastError = e;
      // 실패 시 다음 후보로 계속 진행
    }
  }

  // 모든 후보 실패 시 (마지막 에러 반환)
  throw new Error("KEY_MISMATCH: 암호화 키가 일치하지 않거나 데이터가 손상되었습니다. (Legacy Fallbacks Failed)");
}
