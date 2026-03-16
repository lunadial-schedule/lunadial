/**
 * 치지직 계정 연동 해제
 *
 * connected_accounts 테이블에서 해당 사용자의 치지직 연동 레코드를 삭제한다.
 * TODO: 토큰 철회(revoke)도 함께 수행하면 더 안전하다.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 })
    }

    // DB에서 치지직 연동 레코드 삭제
    const { error: dbError } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "chzzk")

    if (dbError) {
      console.error("치지직 연동 해제 에러:", dbError)
      return NextResponse.json({ error: "연동 해제 실패" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("치지직 연동 해제 에러:", err)
    return NextResponse.json({ error: "서버 에러" }, { status: 500 })
  }
}
