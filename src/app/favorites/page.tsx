import * as React from "react"
import { FavoritesClient } from "./favorites-client"
import { getMyFavorites } from "@/app/actions/favorites"
import { getServerUser } from "@/lib/auth/server-user"
import { redirect } from "next/navigation"

export default async function FavoritesPage() {
  console.time("Favorites_Server_Initial_Data")
  const user = await getServerUser();
  if (!user) {
    console.timeEnd("Favorites_Server_Initial_Data")
    redirect("/login");
  }

  const { data: initialFavorites } = await getMyFavorites();
  console.timeEnd("Favorites_Server_Initial_Data")

  return (
    <FavoritesClient initialFavorites={initialFavorites || []} />
  )
}
