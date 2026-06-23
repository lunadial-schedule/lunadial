import * as React from "react"
import { FavoritesClient } from "./favorites-client"
import { getMyFavorites } from "@/app/actions/favorites"
import { getServerUser } from "@/lib/auth/server-user"
import { redirect } from "next/navigation"

// 사용자별 데이터(즐겨찾기)이므로 Full Route Cache를 비활성화하여 이전 데이터 잔류 방지
export const dynamic = 'force-dynamic'


export default async function FavoritesPage() {

  // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
  const timerLabel = `Favorites_Server_Initial_Data_${crypto.randomUUID().slice(0, 5)}`;
  console.time(timerLabel)
  const user = await getServerUser();
  if (!user) {
    console.timeEnd(timerLabel)
    redirect("/login");
  }

  const { data: initialFavorites } = await getMyFavorites();
  console.timeEnd(timerLabel)

  return (
    <FavoritesClient 
      initialFavorites={initialFavorites || []}

    />
  )
}
