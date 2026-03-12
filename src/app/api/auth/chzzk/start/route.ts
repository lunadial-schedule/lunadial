import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getChzzkOAuthUrl } from "@/lib/server/chzzk-oauth"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const authUrl = await getChzzkOAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error("Failed to start Chzzk OAuth:", error)
    return NextResponse.json({ error: "Failed to initialize Chzzk login" }, { status: 500 })
  }
}
