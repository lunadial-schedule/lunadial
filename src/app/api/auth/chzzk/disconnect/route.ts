import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete record from DB
    const { error: dbError } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "chzzk")

    if (dbError) {
      console.error("Error disconnecting chzzk:", dbError)
      return NextResponse.json({ error: "DB Error" }, { status: 500 })
    }

    // Token revocation is optional. Since we don't have the plaintext token available 
    // unless we query and decrypt it, we can just delete from DB.
    // However, if we must revoke, we could query it first before deleting.
    // MVP: Just delete link.

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Disconnect Chzzk error:", err)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
