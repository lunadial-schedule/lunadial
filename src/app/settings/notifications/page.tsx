"use client"

/**
 * 알림 설정 페이지
 * 보완사항: 실제 API 연동 (GET/PUT), 테스트 푸시 기능 추가
 */
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Bell, ShieldAlert, ShieldCheck, ShieldQuestion, Send, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PushNotificationButton } from "@/components/push-notification-button"
import { NotificationPreferences } from "@/types/push"

export default function NotificationsSettingsPage() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  
  const [prefs, setPrefs] = useState<Partial<NotificationPreferences>>({
    notify_live_start: true,
    notify_schedule_change: true,
    notify_notice: false,
  })

  // 초기 로드: 권한 확인 및 설정 조회
  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported")
    } else {
      setPermission(Notification.permission)
    }

    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/notifications/preferences')
        if (res.ok) {
          const data = await res.json()
          setPrefs(data)
        }
      } catch (e) {
        console.error("Failed to fetch preferences:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchPrefs()
  }, [])

  const handleRequestPermission = async () => {
    if (permission === "unsupported") {
      toast.error("이 브라우저에서는 웹 푸시 알림을 지원하지 않습니다.")
      return
    }
    
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === "granted") {
        toast.success("알림 권한이 허용되었습니다.")
      } else if (result === "denied") {
        toast.error("알림 권한이 차단되었습니다. 브라우저 설정에서 직접 허용해주세요.")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handlePrefChange = async (key: keyof NotificationPreferences, checked: boolean) => {
    const newPrefs = { ...prefs, [key]: checked }
    setPrefs(newPrefs)
    setSaving(true)

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: checked })
      })

      if (!res.ok) throw new Error("저장 실패")
      
      toast.success("알림 설정이 저장되었습니다.")
    } catch (e) {
      toast.error("설정 저장 중 오류가 발생했습니다.")
      // 원복 (간단하게)
      setPrefs(prev => ({ ...prev, [key]: !checked }))
    } finally {
      setSaving(false)
    }
  }

  const handleTestPush = async () => {
    if (permission !== "granted") {
      toast.error("먼저 브라우저 알림 권한을 허용하고 기기를 등록해주세요.")
      return
    }

    setTesting(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        if (data.sent > 0) {
          toast.success("테스트 푸시가 발송되었습니다! 잠시만 기다려주세요.")
        } else {
          toast.warning("등록된 활성 기기가 없습니다. '알림 받기' 버튼을 눌러주세요.")
        }
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      toast.error("테스트 발송 실패: " + (e instanceof Error ? e.message : "알 수 없는 오류"))
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <PageContainer className="py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="py-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">알림 설정</h1>
          </div>
          <PushNotificationButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              브라우저 및 기기 상태
            </CardTitle>
            <CardDescription>
              푸시 알림을 받으시려면 기기와 브라우저의 권한 허용이 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                {permission === "granted" && <ShieldCheck className="h-6 w-6 text-green-500" />}
                {permission === "denied" && <ShieldAlert className="h-6 w-6 text-destructive" />}
                {(permission === "default" || permission === "unsupported") && <ShieldQuestion className="h-6 w-6 text-amber-500" />}
                
                <div>
                  <p className="font-semibold">
                    권한: {
                      permission === "granted" ? "허용됨" :
                      permission === "denied" ? "차단됨" :
                      permission === "unsupported" ? "지원되지 않음" : "미요청"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {permission === "granted" 
                      ? "LUNA DIAL의 알림을 정상적으로 받을 수 있는 상태입니다."
                      : "가장 빠른 스트리머 소식을 위해 알림 권한을 허용해주세요."}
                  </p>
                </div>
              </div>
              
              {permission !== "granted" && permission !== "unsupported" && (
                <Button onClick={handleRequestPermission} variant={permission === "denied" ? "outline" : "default"}>
                  {permission === "denied" ? "설정 방법 보기" : "권한 허용하기"}
                </Button>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestPush} 
                disabled={testing}
                className="gap-2"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                내 기기로 테스트 알림 보내기
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>수신 항목 선택</CardTitle>
            <CardDescription>알림을 받고 싶은 이벤트를 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="notify_live_start" 
                checked={prefs.notify_live_start} 
                onCheckedChange={(c) => handlePrefChange("notify_live_start", c === true)}
                disabled={saving}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="notify_live_start" className="font-semibold cursor-pointer">방송 시작 알림</Label>
                <p className="text-sm text-muted-foreground">즐겨찾기한 스트리머가 방송을 시작하면 바로 알려드립니다.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="notify_schedule_change" 
                checked={prefs.notify_schedule_change} 
                onCheckedChange={(c) => handlePrefChange("notify_schedule_change", c === true)}
                disabled={saving}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="notify_schedule_change" className="font-semibold cursor-pointer">일정 변경/취소 알림</Label>
                <p className="text-sm text-muted-foreground">캘린더 일정이 지연, 앞당겨지거나 취소되었을 때 알려드립니다.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="notify_notice" 
                checked={prefs.notify_notice} 
                onCheckedChange={(c) => handlePrefChange("notify_notice", c === true)}
                disabled={saving}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="notify_notice" className="font-semibold cursor-pointer">공지사항 및 업데이트</Label>
                <p className="text-sm text-muted-foreground">Luna Dial 서비스의 주요 공지 및 기능 업데이트 소식입니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {permission === "denied" && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <p className="font-bold mb-1">알림 권한이 차단되어 있습니다.</p>
            <p>브라우저 주소창 왼쪽의 자물쇠 아이콘을 누르고 '알림' 권한을 '허용'으로 변경해야 알림을 받으실 수 있습니다.</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
