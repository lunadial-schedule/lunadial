"use server"

import { ExtractedScheduleDraft } from "@/components/dashboard/ai-extraction/ai-extraction-form"

/**
 * AI 추출 Mock Server Action (MVP 단계)
 */
export async function extractScheduleFromImage(formData: FormData) {
  // Simulate network delay and AI processing time
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const image = formData.get("image") as File
  const link = formData.get("link") as string
  const streamersRaw = formData.get("streamers") as string
  
  if (!image || !link || !streamersRaw) {
    return { error: "필수 정보가 누락되었습니다." }
  }

  const streamers: string[] = JSON.parse(streamersRaw)
  const primaryStreamer = streamers[0] || "스트리머"

  // Create mock draft results
  const mockResults: ExtractedScheduleDraft[] = [
    {
      id: "mock-1",
      isSelected: true,
      date: new Date().toISOString().split("T")[0],
      startTime: "19:00",
      endTime: null,
      isAllDay: false,
      title: `${primaryStreamer} 마인크래프트 대규모 합방`,
      streamerName: primaryStreamer,
      category: "합방",
      memo: "이미지 내용에서 추출함",
      noticeUrl: link,
      status: "ready",
      confidence: 0.95,
    },
    {
      id: "mock-2",
      isSelected: true,
      date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
      startTime: null, // Time missing
      endTime: null,
      isAllDay: true, // Rule: Time missing -> All Day
      title: `${primaryStreamer} 일상 소통 및 게임`,
      streamerName: primaryStreamer,
      category: "컨텐츠",
      memo: "시간 정보를 찾을 수 없어 하루 종일로 설정되었습니다.",
      noticeUrl: link,
      status: "needs_review",
      confidence: 0.75,
    },
    {
      id: "mock-3",
      isSelected: true,
      date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], // Day after tomorrow
      startTime: "20:00",
      endTime: null,
      isAllDay: false,
      title: "추출 정보를 확인해주세요",
      streamerName: primaryStreamer,
      category: "기타",
      memo: "",
      noticeUrl: link,
      status: "incomplete",
      confidence: 0.5,
    }
  ]

  return { data: mockResults }

}
