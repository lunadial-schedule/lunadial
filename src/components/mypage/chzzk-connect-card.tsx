"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Link2, Unlink } from "lucide-react"

interface ChzzkAccount {
  id: string
  provider_user_id: string
  provider_username: string | null
}

interface ChzzkConnectCardProps {
  initialAccount: ChzzkAccount | null
  onAccountChange?: () => void
}

export function ChzzkConnectCard({ initialAccount, onAccountChange }: ChzzkConnectCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [account, setAccount] = useState<ChzzkAccount | null>(initialAccount)

  const handleConnect = () => {
    setIsLoading(true)
    // 리다이렉트를 통한 연동 시작
    window.location.href = "/api/auth/chzzk/start"
  }

  const handleDisconnect = async () => {
    if (!confirm("치지직 계정 연결을 해제하시겠습니까?")) return

    try {
      setIsLoading(true)
      const res = await fetch("/api/auth/chzzk/disconnect", {
        method: "POST"
      })

      if (!res.ok) {
        throw new Error("Failed to disconnect")
      }

      setAccount(null)
      toast.success("치지직 계정 연결이 해제되었습니다.")
      if (onAccountChange) onAccountChange()
    } catch (error) {
      console.error(error)
      toast.error("연결 해제 처리 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-[#00FFA3]"
          >
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0Z" fill="currentColor"/>
            <path d="M7 16V8L17 14L7 16Z" fill="#141517"/>
          </svg>
          치지직 계정 연동
        </CardTitle>
        <CardDescription>
          치지직 계정을 연결하여 더욱 편리하게 방송 일정을 관리하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {account ? (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
            <div>
              <p className="font-semibold text-sm">연결된 채널</p>
              <p className="text-lg font-bold">{account.provider_username}</p>
              <p className="text-xs text-muted-foreground mt-1 gap-1 flex items-center">
                <Link2 className="w-3 h-3" />
                {account.provider_user_id}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlink className="w-4 h-4 mr-2" />}
              연결 해제
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 p-4 border rounded-lg bg-muted/10 items-center justify-between sm:flex-row">
            <p className="text-sm text-muted-foreground">
              현재 연결된 치지직 계정이 없습니다.
            </p>
            <Button onClick={handleConnect} disabled={isLoading} className="bg-[#00FFA3] text-black hover:bg-[#00E592]">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              치지직 계정 연결
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
