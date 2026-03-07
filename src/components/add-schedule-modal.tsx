"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { parseScheduleFromLink } from "@/app/actions/parse-schedule"

export default function AddScheduleModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    streamerId: "",
    title: "",
    startAt: "",
    endAt: "",
    category: "컨텐츠" as "컨텐츠" | "합방" | "대회" | "기타",
    sourceUrl: "",
    description: ""
  })

  const handleAiAutofill = async () => {
    if (!formData.sourceUrl) {
      alert("공지 링크를 먼저 입력해주세요.")
      return
    }
    
    setLoading(true)
    try {
      // 아주 단순한 우회 방법으로 서버 액션을 통해 웹페이지를 가져오는 것을 가정.
      // MVP 단계이므로 서버에서 URL fetch를 대신 수행한다고 가정하고 직접 호출
      // (실무에서는 클라이언트가 주는 url로 서버 액션 내에서 cheerio 등을 통해 HTML을 긁어 AI에 전달해야 함)
      
      const res = await parseScheduleFromLink(formData.sourceUrl, "User-provided URL to be scraped via server. (mock html)")
      setFormData(prev => ({
        ...prev,
        title: res.title,
        startAt: res.startAt,
        category: res.category
      }))
    } catch (error) {
      alert("AI 연동 오류: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: CALL Server action `createSchedule`
      console.log("Submit:", formData)
      
      // Simulate success
      setTimeout(() => {
        setOpen(false)
        setLoading(false)
        alert("일정이 등록되었습니다.")
      }, 500)
    } catch (error) {
       console.error(error)
       setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="hidden sm:flex items-center gap-2">
          <Plus className="h-4 w-4" />
          일정 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 일정 등록하기</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
           <div className="space-y-2">
              <Label htmlFor="sourceUrl">공지 링크 (필수)</Label>
              <div className="flex gap-2">
                <Input 
                  id="sourceUrl" 
                  placeholder="https://..." 
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})}
                  required
                />
                <Button type="button" variant="secondary" onClick={handleAiAutofill} disabled={loading}>
                  AI 자동채우기
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                치지직 카페, 트게더 등 일정을 증명할 수 있는 링크를 입력해주세요.
              </p>
           </div>
           
           <div className="space-y-2">
              <Label htmlFor="streamerId">스트리머 아이디 (Chzzk Channel ID)</Label>
              <Input 
                id="streamerId" 
                value={formData.streamerId}
                onChange={(e) => setFormData({...formData, streamerId: e.target.value})}
                required
              />
           </div>

           <div className="space-y-2">
              <Label htmlFor="title">일정 제목</Label>
              <Input 
                id="title" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="startAt">시작 일시</Label>
                <Input 
                  id="startAt" 
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({...formData, startAt: e.target.value})}
                  required
                />
             </div>
             <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <select 
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background  py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, category: e.target.value as "컨텐츠" | "합방" | "대회" | "기타"})}
                >
                  <option value="컨텐츠">방송 (컨텐츠)</option>
                  <option value="합방">합방</option>
                  <option value="대회">대회</option>
                  <option value="기타">기타</option>
                </select>
             </div>
           </div>

           <div className="space-y-2">
              <Label htmlFor="description">추가 설명 (선택)</Label>
              <Textarea 
                id="description" 
                placeholder="합방 멤버 등 추가 내용을 적어주세요."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
           </div>

           <div className="pt-4 flex justify-end gap-2">
             <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
             <Button type="submit" disabled={loading}>
               {loading ? "저장 중..." : "일정 저장"}
             </Button>
           </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
