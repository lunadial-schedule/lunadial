/**
 * 계정 삭제 API
 *
 * 현재 로그인 사용자 본인만 삭제할 수 있다.
 * 외부에서 user_id를 받지 않으며, 세션 기반으로만 대상을 결정한다.
 *
 * 처리 순서:
 *   1. 인증 확인
 *   2. Pro / admin 구독 상태 재검증 → 활성이면 차단
 *   3. 공용 데이터 익명화 (schedules, schedule_update_logs, schedule_revisions, notices)
 *   4. 개인 데이터 완전 삭제 (notification_deliveries, notification_preferences, push_subscriptions, connected_accounts, favorites, profiles)
 *   5. Storage 아바타 파일 삭제
 *   6. 운영 로그 기록 (account_deletion_logs)
 *   7. auth.admin.deleteUser() — 반드시 마지막
 *
 * 보안:
 *   - 서버 세션 기반으로만 사용자 식별
 *   - Service Role Key는 서버에서만 사용
 *   - 타 유저 ID를 받아 삭제하는 구조 금지
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** 익명화 처리 시 사용할 닉네임 */
const ANONYMOUS_NICKNAME = "탈퇴한 사용자"

interface DeletionResult {
  table: string
  count: number
  status: "success" | "error"
  error?: string
}

export async function POST() {
  const errors: string[] = []
  const deletedTables: DeletionResult[] = []
  const anonymizedTables: DeletionResult[] = []
  let storageDeleted = false

  try {
    // ──────────────────────────────────────────
    // 1. 현재 로그인 사용자 확인
    // ──────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "계정 정보를 확인할 수 없습니다. 다시 로그인해주세요." },
        { status: 401 }
      )
    }

    const userId = user.id
    const userEmail = user.email || null
    const userNickname = user.user_metadata?.name || null

    // ──────────────────────────────────────────
    // 2. Pro / admin 구독 상태 재검증
    // ──────────────────────────────────────────
    const adminSupabase = createAdminClient()

    // users.tier 확인
    const { data: userData } = await adminSupabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .maybeSingle()

    // user_roles.role 확인
    const { data: roleData } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()

    const tier = userData?.tier || "free"
    const role = roleData?.role || "user"
    const subscriptionStatus = `tier:${tier},role:${role}`

    const isProOrAdmin =
      tier === "pro" || role === "pro" || role === "admin"

    if (isProOrAdmin) {
      return NextResponse.json(
        {
          error:
            "현재 Pro 구독이 활성화되어 있어 계정 삭제 전에 먼저 구독 해지가 필요합니다.",
        },
        { status: 403 }
      )
    }

    // ──────────────────────────────────────────
    // 3. 공용 데이터 익명화
    //    익명화는 admin 클라이언트(RLS 우회)로 수행
    // ──────────────────────────────────────────

    // 3-1. schedules — user_id를 null로
    try {
      const { data, error } = await adminSupabase
        .from("schedules")
        .update({ user_id: null as unknown as string })
        .eq("user_id", userId)
        .select("id")

      anonymizedTables.push({
        table: "schedules",
        count: data?.length || 0,
        status: error ? "error" : "success",
        error: error?.message,
      })
      if (error) errors.push(`schedules 익명화 실패: ${error.message}`)
    } catch (e: any) {
      anonymizedTables.push({ table: "schedules", count: 0, status: "error", error: e.message })
      errors.push(`schedules 익명화 예외: ${e.message}`)
    }

    // 3-2. schedule_update_logs — actor_user_id null, actor_nickname 변경
    try {
      const { data, error } = await adminSupabase
        .from("schedule_update_logs")
        .update({
          actor_user_id: null as unknown as string,
          actor_nickname: ANONYMOUS_NICKNAME,
        })
        .eq("actor_user_id", userId)
        .select("id")

      anonymizedTables.push({
        table: "schedule_update_logs",
        count: data?.length || 0,
        status: error ? "error" : "success",
        error: error?.message,
      })
      if (error) errors.push(`schedule_update_logs 익명화 실패: ${error.message}`)
    } catch (e: any) {
      anonymizedTables.push({ table: "schedule_update_logs", count: 0, status: "error", error: e.message })
      errors.push(`schedule_update_logs 익명화 예외: ${e.message}`)
    }

    // 3-3. schedule_revisions — edited_by null
    try {
      const { data, error } = await adminSupabase
        .from("schedule_revisions")
        .update({ edited_by: null as unknown as string })
        .eq("edited_by", userId)
        .select("id")

      anonymizedTables.push({
        table: "schedule_revisions",
        count: data?.length || 0,
        status: error ? "error" : "success",
        error: error?.message,
      })
      if (error) errors.push(`schedule_revisions 익명화 실패: ${error.message}`)
    } catch (e: any) {
      anonymizedTables.push({ table: "schedule_revisions", count: 0, status: "error", error: e.message })
      errors.push(`schedule_revisions 익명화 예외: ${e.message}`)
    }

    // 3-4. notices — author_user_id null, author_nickname 변경
    try {
      const { data, error } = await adminSupabase
        .from("notices")
        .update({
          author_user_id: null as unknown as string,
          author_nickname: ANONYMOUS_NICKNAME,
        })
        .eq("author_user_id", userId)
        .select("id")

      anonymizedTables.push({
        table: "notices",
        count: data?.length || 0,
        status: error ? "error" : "success",
        error: error?.message,
      })
      if (error) errors.push(`notices 익명화 실패: ${error.message}`)
    } catch (e: any) {
      anonymizedTables.push({ table: "notices", count: 0, status: "error", error: e.message })
      errors.push(`notices 익명화 예외: ${e.message}`)
    }

    // ──────────────────────────────────────────
    // 4. 개인 데이터 완전 삭제
    // ──────────────────────────────────────────

    const tablesToDelete = [
      "notification_deliveries",
      "notification_preferences",
      "push_subscriptions",
      "connected_accounts",
      "favorites",
      "profiles",
    ] as const

    for (const table of tablesToDelete) {
      try {
        // profiles는 PK가 id = userId, 나머지는 user_id
        const column = table === "profiles" ? "id" : "user_id"
        const { data, error } = await adminSupabase
          .from(table)
          .delete()
          .eq(column, userId)
          .select("id")

        deletedTables.push({
          table,
          count: data?.length || 0,
          status: error ? "error" : "success",
          error: error?.message,
        })
        if (error) errors.push(`${table} 삭제 실패: ${error.message}`)
      } catch (e: any) {
        deletedTables.push({ table, count: 0, status: "error", error: e.message })
        errors.push(`${table} 삭제 예외: ${e.message}`)
      }
    }

    // ──────────────────────────────────────────
    // 5. Storage 아바타 파일 삭제
    // ──────────────────────────────────────────
    try {
      // 사용자 폴더 내 모든 파일 나열 후 삭제
      const { data: files } = await adminSupabase.storage
        .from("avatars")
        .list(userId)

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${userId}/${f.name}`)
        const { error: removeError } = await adminSupabase.storage
          .from("avatars")
          .remove(filePaths)

        if (removeError) {
          errors.push(`Storage 삭제 실패: ${removeError.message}`)
          console.error("[계정 삭제] Storage 삭제 실패:", removeError)
        } else {
          storageDeleted = true
        }
      } else {
        // 파일이 없는 경우도 정상
        storageDeleted = true
      }
    } catch (e: any) {
      // Storage 실패가 전체 탈퇴를 막으면 안 됨
      errors.push(`Storage 삭제 예외: ${e.message}`)
      console.error("[계정 삭제] Storage 삭제 예외:", e)
    }

    // ──────────────────────────────────────────
    // 6. 운영 로그 기록
    // ──────────────────────────────────────────
    const overallStatus =
      errors.length === 0 ? "success" : "partial_failure"

    try {
      await adminSupabase.from("account_deletion_logs").insert({
        user_id: userId,
        user_email: userEmail,
        user_nickname: userNickname,
        subscription_status: subscriptionStatus,
        deleted_tables: deletedTables as unknown as Record<string, unknown>,
        anonymized_tables: anonymizedTables as unknown as Record<string, unknown>,
        storage_deleted: storageDeleted,
        status: overallStatus,
        error_details: errors.length > 0 ? errors.join("; ") : null,
      })
    } catch (logError: any) {
      // 로그 기록 실패가 전체 삭제를 막으면 안 됨
      console.error("[계정 삭제] 운영 로그 기록 실패:", logError)
    }

    // ──────────────────────────────────────────
    // 7. auth 계정 삭제 — 반드시 마지막
    //    createAdminClient의 admin API로 삭제
    // ──────────────────────────────────────────
    const { error: deleteAuthError } =
      await adminSupabase.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      // auth 삭제 실패 시 운영 로그 업데이트
      console.error("[계정 삭제] auth 삭제 실패:", deleteAuthError)
      try {
        // 이미 기록된 로그를 failure로 업데이트하기 어렵기 때문에 추가 로그
        await adminSupabase.from("account_deletion_logs").insert({
          user_id: userId,
          user_email: userEmail,
          user_nickname: userNickname,
          subscription_status: subscriptionStatus,
          deleted_tables: deletedTables as unknown as Record<string, unknown>,
          anonymized_tables: anonymizedTables as unknown as Record<string, unknown>,
          storage_deleted: storageDeleted,
          status: "failure",
          error_details: `auth 삭제 실패: ${deleteAuthError.message}; 이전 오류: ${errors.join("; ")}`,
        })
      } catch {
        // 최종 방어
      }

      return NextResponse.json(
        { error: "계정 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      )
    }

    // ──────────────────────────────────────────
    // 8. 성공 응답
    // ──────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: "계정이 삭제되었습니다.",
    })
  } catch (error: any) {
    console.error("[계정 삭제] 예상하지 못한 오류:", error)
    return NextResponse.json(
      { error: "계정 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    )
  }
}
