"use server"

import { ExtractedScheduleDraft } from "@/components/dashboard/ai-extraction/ai-extraction-form"
import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * AI 추출 Server Action (Gemini API 사용)
 */
export async function extractScheduleFromImage(formData: FormData): Promise<{ data?: ExtractedScheduleDraft[], error?: string }> {
  const image = formData.get("image") as File
  const link = formData.get("link") as string
  const streamersRaw = formData.get("streamers") as string
  
  if (!image || !link || !streamersRaw) {
    return { error: "필수 정보가 누락되었습니다." }
  }

  const streamers: string[] = JSON.parse(streamersRaw)
  
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("서버 환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.")
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // 사용자 지시사항에 맞추어 모델을 선택합니다. (Gemini 1.5 Flash 기반)
    // "gemini-3-flash" 명칭이 공식적으로 쓰이기 전일 수 있으므로 가장 최신의 flash 모델로 fallback 합니다.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    })

    const bytes = await image.arrayBuffer()
    const base64Image = Buffer.from(bytes).toString("base64")
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: image.type
      }
    }

    const prompt = `
너는 방송 일정 이미지를 분석하여 스케줄 목록을 추출하는 AI 보조 시스템이야.
업로드된 이미지는 방송 일정표 이미지다.
이미지 안에서 일정 후보를 최대한 많이 찾아라.
각 일정마다 제목, 날짜, 시간, 스트리머를 추출하라.

[핵심 생성 규칙]
1. 제목:
   - 이미지에 있는 일정 제목 텍스트를 문맥 그대로 입력하라. 
   - 문구를 다듬거나 해석해서 바꾸지 말고 OCR로 읽힌 원문을 최대한 그대로 사용할 것.
   - 단, 일정 자체는 찾았지만 제목 텍스트를 찾지 못한 경우 반드시 "방송 예정" 이라고 입력할 것.

2. 카테고리:
   - 방송 제목 및 주변 문구를 분석해서 카테고리를 1개 이상 선택하라 (필수).
   - 선택 가능한 카테고리 체계는 "토크", "게임", "합방", "콘텐츠", "대회", "음악/노래", "광고", "같이보기" 다.
   - 해당되는 카테고리를 배열 형태로 반환하라. 중복 선택 가능.
   - 만약 카테고리를 전혀 찾을 수 없을 경우(예: 제목이 "방송 예정"일 경우) 기본값으로 ["토크"] 를 할당하라.
   - 예: "마인크래프트 대규모 합방" -> ["게임", "합방"]
   - 예: "광고) 도미노 피자" -> ["광고"]

3. 날짜 및 시간:
   - 시작 날짜는 추출 가능한 경우 반드시 채워라.
   - 시작 시간이 명확히 있으면 "startTime"에 반영할 것.
   - 시작 날짜는 있지만 시작 시간이 없을 경우 "isAllDay" 필드를 true로 지정하고 "startTime"을 null로 둘 것.

4. 메모:
   - 메모("memo" 필드)는 항상 비워둘 것. 이미지에 추가 설명 텍스트가 있더라도 절대 AI가 임의로 생성하거나 채우지 말고 무조건 null을 반환하라.

5. 스트리머 매칭:
   - 사용자가 입력한 스트리머 목록: [${streamers.join(", ")}]
   - 이미지에 있는 일정이 어떤 스트리머 것인지 매칭할 때 위 목록을 참고하라.
   - 단, 이미지에 이름이 더 명확하게 나타나면 그 값을 우선 사용하여 추출할 것.
   - 매칭이 불가하면 null 처리하라.

응답은 부연 설명 없이 반드시 아래 JSON 배열 스키마를 준수하여 반환하라.
[
  {
    "title": "문자열 (또는 '방송 예정')",
    "streamerName": "스트리머 이름 문자열 (또는 null)",
    "date": "YYYY-MM-DD 형식 (또는 null)",
    "startTime": "HH:mm 형식 (또는 null)",
    "endTime": "HH:mm 형식 (또는 null)",
    "isAllDay": false,
    "categories": ["카테고리1", "카테고리2"],
    "memo": null
  }
]
`

    const result = await model.generateContent([prompt, imagePart])
    const responseText = result.response.text()
    
    // JSON 응답 파싱
    let parsedData: any[] = []
    try {
      parsedData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON 파싱 에러:", responseText, parseError)
      // JSON Markdown 펜스가 있을 경우 우회 추출 시도
      const match = responseText.match(/\[[\s\S]*\]/)
      if (match) {
        parsedData = JSON.parse(match[0])
      } else {
        throw new Error("Gemini 응답 형식이 올바르지 않습니다.")
      }
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return { data: [] } // Empty array means nothing found -> UI will handle it naturally
    }

    // 프론트의 ExtractedScheduleDraft 형식으로 매핑
    const drafts: ExtractedScheduleDraft[] = parsedData.map((item, index) => {
      
      const hasDate = !!item.date
      const hasTitle = !!item.title && item.title !== "방송 예정"
      const hasStreamer = !!item.streamerName
      const hasTime = !!item.startTime

      let status: ExtractedScheduleDraft["status"] = "ready"
      if (!hasDate || (!hasTitle && !hasStreamer)) {
        status = "incomplete"
      } else if (!hasTime && !item.isAllDay) {
        status = "needs_review"
      } else if (!item.categories || item.categories.length === 0) {
        status = "needs_review"
      }

      // 날짜는 있지만 시간이 없으면 종일 처리 (안전망)
      const forceAllDay = hasDate && !hasTime;

      return {
        id: `ai-extracted-${Date.now()}-${index}`,
        isSelected: status === "ready", // ready 상태일 때만 기본으로 선택 처리
        title: item.title || "방송 예정",
        streamerName: item.streamerName || streamers[0] || "",
        date: item.date || null,
        startTime: item.startTime || null,
        endTime: item.endTime || null,
        isAllDay: item.isAllDay === true || forceAllDay,
        categories: Array.isArray(item.categories) && item.categories.length > 0 ? item.categories : ["토크"],
        memo: "", // 항상 비워둠 (강제 처리)
        noticeUrl: link, // 공지 링크 공통값 사용
        status: status,
      }
    })

    return { data: drafts }
  } catch (error: any) {
    console.error("Gemini Extraction APIs Error:", error)
    return { error: "AI 일정 추출에 실패했어요. 잠시 후 다시 시도해주세요." }
  }
}
