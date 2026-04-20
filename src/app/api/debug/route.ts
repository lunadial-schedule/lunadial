import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: account, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("provider", "chzzk")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: "no account" })
  }

  const keyStr = process.env.ENCRYPTION_KEY || "";
  const result = {
    keyLen: keyStr.length,
    keyLastChar: keyStr.charCodeAt(keyStr.length - 1),
    accountStrLen: account.refresh_token_encrypted?.length,
    accountStrStart: account.refresh_token_encrypted?.substring(0, 10),
    decrypted: "false",
    errMessage: "",
  }

  try {
    const key = crypto.createHash('sha256').update(keyStr).digest()
    const encryptedData = account.refresh_token_encrypted!
    
    const parts = encryptedData.split(":")
    const iv = Buffer.from(parts[0], "base64")
    const authTag = Buffer.from(parts[1], "base64")
    const encryptedText = parts[2]
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedText, "base64", "utf8")
    decrypted += decipher.final("utf8")
    result.decrypted = "true"
  } catch (e: any) {
    result.errMessage = e.message
  }

  return NextResponse.json(result)
}
