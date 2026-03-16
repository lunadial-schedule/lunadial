"use client"

/**
 * 알림 설정 페이지
 *
 * 브라우저 알림 권한 상태를 표시하고, 방송 시작/일정 변경/취소/공지사항 등
 * 항목별로 알림 수신 여부를 토글할 수 있다.
 */
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Bell, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function NotificationsSettingsPage() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  
  const [prefs, setPrefs] = useState({
    streamStart: true,
    scheduleChange: true,
    scheduleCancel: true,
    notices: false,
  })

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported")
    } else {
      setPermission(Notification.permission)
    }
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

  const handlePrefChange = (key: keyof typeof prefs, checked: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: checked }))
    toast(`알림 설정이 저장되었습니다.`) // Mock save
  }

  return (
    <PageContainer className="py-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">알림 설정</h1>
          <p className="text-muted-foreground">어떤 알림을 언제 받을지 결정하세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              브라우저 알림 권한
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
                    현재 상태: {
                      permission === "granted" ? "허용됨" :
                      permission === "denied" ? "차단됨 (직접 해제 필요)" :
                      permission === "unsupported" ? "지원되지 않음" : "미요청"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {permission === "granted" 
                      ? "이제 LUNA DIAL의 알림을 안정적으로 받을 수 있습니다."
                      : "가장 빠른 스트리머 소식을 위해 알림을 켜주세요."}
                  </p>
                </div>
              </div>
              
              {permission !== "granted" && permission !== "unsupported" && (
                <Button onClick={handleRequestPermission} variant={permission === "denied" ? "outline" : "default"}>
                  {permission === "denied" ? "재요청 방법 보기" : "권한 허용하기"}
                </Button>
              )}
            </div>
            
            {permission === "denied" && (
              <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md border text-center">
                설정 &gt; 사이트 설정 &gt; LUNA DIAL &gt; 알림 메뉴에서 차단을 해제해야 합니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>알림 수신 설정</CardTitle>
            <CardDescription>어떤 상황에서 알람을 받을지 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="streamStart" 
                checked={prefs.streamStart} 
                onCheckedChange={(c) => handlePrefChange("streamStart", c === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="streamStart" className="font-semibold cursor-pointer">방송 시작 알림</Label>
                <p className="text-sm text-muted-foreground">즐겨찾기 스트리머가 방송을 켰을 때 즉시 알려줍니다.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="scheduleChange" 
                checked={prefs.scheduleChange} 
                onCheckedChange={(c) => handlePrefChange("scheduleChange", c === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="scheduleChange" className="font-semibold cursor-pointer">일정 변경</Label>
                <p className="text-sm text-muted-foreground">캘린더에 적힌 일정이 지연되거나 앞당겨질 때 알려줍니다.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="scheduleCancel" 
                checked={prefs.scheduleCancel} 
                onCheckedChange={(c) => handlePrefChange("scheduleCancel", c === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="scheduleCancel" className="font-semibold cursor-pointer">일정 취소 (휴방)</Label>
                <p className="text-sm text-muted-foreground">예정된 방송이 취소되거나 급작스러운 휴방 공지 시 알려줍니다.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/10 transition-colors">
              <Checkbox 
                id="notices" 
                checked={prefs.notices} 
                onCheckedChange={(c) => handlePrefChange("notices", c === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="notices" className="font-semibold cursor-pointer">기타 서비스 공지사항</Label>
                <p className="text-sm text-muted-foreground">Luna Dial 서비스 업데이트 및 중요 이벤트 알림입니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
