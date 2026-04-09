import * as React from "react"
import { FavoritesClient } from "./favorites-client"
import { getMyFavorites } from "@/app/actions/favorites"
import { getServerUser } from "@/lib/auth/server-user"
import { redirect } from "next/navigation"

export default async function FavoritesPage() {

  // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
  const timerLabel = `Favorites_Server_Initial_Data_${Math.random().toString(36).slice(2, 7)}`;
  console.time(timerLabel)
  const user = await getServerUser();
  if (!user) {
    console.timeEnd(timerLabel)
    redirect("/login");
  }

  const { data: initialFavorites } = await getMyFavorites();
  console.timeEnd(timerLabel)

  return (
    <FavoritesClient initialFavorites={initialFavorites || []} />
  )
}
