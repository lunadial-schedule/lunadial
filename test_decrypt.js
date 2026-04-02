require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("Missing ENCRYPTION_KEY");
  return crypto.createHash('sha256').update(key).digest();
}

function decryptString(encryptedData) {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 3) throw new Error("Invalid format");
  
  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encryptedText = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

try {
  const encrypted = "kNNvAW0/79uUR6VR:cvqI0Yk4HCRsbRq76HomAA==:BXbXx5OP/U/fTU4SL3PcQkXcx7VGeKOKqQLKlaOPcC+gMHmAEDkbjxhmT0yHm9ZDsaSs/kB6/In35QiFbkxn6V5dvLWsC8xHOJjQcBYmVbNv2fhWtho=";
  console.log("Decrypted refresh token:", decryptString(encrypted));
} catch(e) {
  console.error("Decrypt error:", e);
}
