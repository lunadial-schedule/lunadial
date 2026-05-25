"use server"

import type { ExtractedScheduleDraft } from "@/components/dashboard/ai-extraction/ai-extraction-form"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getCategoryByLabel, CATEGORIES } from "@/config/categories"

/**
 * AI 추출 Server Action (Gemini API 사용)
 */
export async function extractScheduleFromImage(formData: FormData): Promise<{ data?: ExtractedScheduleDraft[], error?: string }> {
  try {
    const image = formData.get("image") as File
    const link = formData.get("link") as string
    const streamersRaw = formData.get("streamers") as string
    
    if (!image || !streamersRaw) {
      return { error: "필수 정보가 누락되었습니다." }
    }

    const streamers: string[] = JSON.parse(streamersRaw)
    
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("서버 환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.")
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // 사용자 지시사항에 맞추어 모델을 선택합니다. (Gemini 2.5 Flash 기반)
    // 운영 안정성 우선: gemini-3.5-flash
    // 최신 성능 우선 : gemini-3.1-pro
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-pro",
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

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    const prompt = `
너는 방송 일정표 이미지에서 일정을 "추출"하는 OCR/정보추출 도우미다.
너의 역할은 이미지를 보고 보이는 정보를 구조화하는 것이며, 절대 내용을 창작하거나 자연스럽게 고쳐 쓰면 안 된다.

[작업 목적]
업로드된 이미지는 스트리머 방송 일정표 이미지다.
이미지 안에서 일정 후보를 최대한 정확하게 찾아 JSON으로 반환하라.

[현재 시점 정보]
- 시스템의 현재 날짜(오늘): ${currentYear}년 ${currentMonth}월 ${currentDay}일
- 이 정보를 바탕으로 "오늘, 내일, 모레, 이번주 금요일" 같은 상대적 시간 표현을 정확한 절대 날짜(YYYY-MM-DD)로 변환하라.

[중요 원칙]
1. 추출 작업만 수행하라. 해석, 요약, 문장 작성 등은 하지 말라.
2. 이미지에서 보이지 않는 정보는 확정적으로 지어내지 말고 반드시 null로 비워두어라.
3. 데이터가 일부 누락(시간 없음, 날짜 없음, 제목 불명확 등)되어도 하나의 일정으로 볼 수 있다면 반드시 배열에 포함(부분 성공)하라. 절대 임의로 누락시키지 말라.
4. 제목은 이미지에 적힌 텍스트를 최대한 그대로 사용하라.
5. 응답은 반드시 JSON 배열만 반환하라. 설명, 주석, 코드블록, 머리말, 꼬리말을 절대 포함하지 말라.

[입력 참고 정보]
사용자가 입력한 스트리머 후보 목록:
[${streamers.join(", ")}]

[필드 규칙]
1. title
- 이미지에 있는 제목 텍스트를 그대로 추출하라.
- 제목만 찾을 수 없고 일정 자체는 식별 가능한 경우에만 "방송 예정"을 넣어라.
- "휴방", "휴방입니다", "OFFLINE" 같은 명시적 휴방 일정은 제외하라.

2. streamerName
- 반드시 사용자 후보 목록 안에서만 선택하라. 1명이면 무조건 그 이름을 사용하라.

3. date
- 반드시 YYYY-MM-DD 형식으로 반환하라.
- 날짜의 연도(Year)가 이미지에 없으면 무조건 현재 연도(${currentYear})를 사용하라. 
  (단, 12월에 다음 해 1월 일정이 올라오는 등 문맥상 명백히 다음 해 라면 ${currentYear + 1}년으로 보완하라.)
- 과거 연도(예: 2023, 2024 등)를 임의로 추정하지 말라.
- 월/일 정보가 명확하지 않으면 null 처리하라.

4. startTime / endTime
- HH:mm 24시간 형식으로 반환하라.
- 명확히 알 수 없으면 반드시 null로 반환하라. ("미정", "아침" 같은 문자열 사용 불가)

5. isAllDay
- date는 있지만 startTime이 없으면 true, 있으면 false. date가 null이면 false.

6. categories
- "토크", "게임", "합방", "콘텐츠", "대회", "음악/노래", "광고", "같이보기" 중 선택. 모르면 ["토크"]

7. memo
- 무조건 null로 반환하라.

[출력 제약]
- 무조건 아래 형식의 JSON 배열만 반환. (마크다운 금지)
[
  {
    "title": "마인크래프트 대규모 합방",
    "streamerName": "풍월량",
    "date": "${currentYear}-01-01",
    "startTime": "19:00",
    "endTime": null,
    "isAllDay": false,
    "categories": ["게임", "합방"],
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
      const match = responseText.match(/\[[\s\S]*\]/)
      if (match) {
        parsedData = JSON.parse(match[0])
      } else {
        return { error: "AI 응답 문서 형식이 깨졌습니다. 이미지가 너무 길거나 복잡한지 확인해주세요." }
      }
    }

    if (!Array.isArray(parsedData)) {
      return { data: [] }
    }

    // 과도한 연도 강제 덮어쓰기 논리 제거
    // AI가 현재 시점을 기반으로 똑똑하게 뱉었다고 가정하되, 매우 오래된 과거(2년 전 등)로 환각하면 현재 연도로 보정
    const normalizeDateYearSafely = (dateStr: string | null) => {
      if (!dateStr) return null;
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return dateStr;
      
      const parsedYear = parseInt(match[1], 10);
      const month = match[2];
      const day = match[3];
      
      if (parsedYear < currentYear - 1) {
        return `${currentYear}-${month}-${day}`;
      }
      return dateStr;
    }

    // 프론트의 ExtractedScheduleDraft 형식으로 매핑
    const drafts: ExtractedScheduleDraft[] = parsedData.map((item, index) => {
      
      // 안전한 강제 연도 보정 적용
      const normalizedDate = normalizeDateYearSafely(item.date) || null;
      
      const hasDate = !!normalizedDate
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

      // 카테고리 텍스트 라벨을 내부 ID로 변환 (예: "게임" -> "game") 
      // 사용자가 프롬프트에 '콘텐츠'로 작성했을 수 있으므로 '컨텐츠'로 보정
      const mappedCategories = Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories.map((label: string) => {
            const cleanLabel = label === "콘텐츠" ? "컨텐츠" : label;
            return getCategoryByLabel(cleanLabel).id;
          })
        : [CATEGORIES.TALK.id];
      
      const finalCategories = [...new Set(mappedCategories)] as string[];

      return {
        id: `ai-extracted-${Date.now()}-${index}`,
        isSelected: status === "ready", // ready 상태일 때만 기본으로 선택 처리
        title: item.title || "방송 예정",
        streamerName: item.streamerName || streamers[0] || "",
        date: normalizedDate,
        startTime: item.startTime || null,
        endTime: item.endTime || null,
        isAllDay: item.isAllDay === true || forceAllDay,
        categories: finalCategories,
        memo: "", // 항상 비워둠 (강제 처리)
        noticeUrl: link, // 공지 링크 공통값 사용
        streamerId: null, // 초기값 null, 이후 폼에서 매칭 시도
        status: status,
      }
    })

    return { data: drafts }
  } catch (error: any) {
    console.error("Gemini Extraction APIs Error:", error)
    return { error: "AI 일정 추출에 실패했어요. 잠시 후 다시 시도해주세요." }
  }
}
