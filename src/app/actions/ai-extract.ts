"use server"

import { ExtractedScheduleDraft } from "@/components/dashboard/ai-extraction/ai-extraction-form"
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
    // 운영 안정성 우선: gemini-2.5-flash
    // 최신 성능 우선, preview 감수 가능: gemini-3-flash-preview
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
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
너는 방송 일정표 이미지에서 일정을 "추출"하는 OCR/정보추출 도우미다.
너의 역할은 이미지를 보고 보이는 정보를 구조화하는 것이며, 절대 내용을 창작하거나 자연스럽게 고쳐 쓰면 안 된다.

[작업 목적]
업로드된 이미지는 스트리머 방송 일정표 이미지다.
이미지 안에서 일정 후보를 최대한 정확하게 찾아 JSON으로 반환하라.

[중요 원칙]
1. 추출 작업만 수행하라. 해석, 요약, 재작성, 홍보 문구 생성은 하지 말라.
2. 이미지에서 보이지 않는 정보를 함부로 추정하지 말라.
3. 단, 날짜의 연도/월이 이미지에 없을 경우에는 아래 날짜 규칙에 따라 currentYear/currentMonth를 사용하라.
4. 제목은 이미지에 적힌 텍스트를 최대한 그대로 사용하라.
5. 제목만 찾을 수 없고 일정 자체는 식별 가능한 경우에만 title에 "방송 예정"을 넣어라.
6. 메모는 항상 null로 반환하라.
7. 응답은 반드시 JSON 배열만 반환하라. 설명, 주석, 코드블록, 머리말, 꼬리말을 절대 포함하지 말라.

[입력 참고 정보]
사용자가 입력한 스트리머 후보 목록:
[${streamers.join(", ")}]

설명:
- streamerName은 반드시 위 후보 목록 안에서만 선택하라.
- 사용자가 입력한 스트리머가 1명이라면 모든 일정의 streamerName은 그 이름으로 통일하라.
- 사용자가 입력한 스트리머가 여러 명이라면 후보 목록 중 가장 적절한 이름만 선택하라.
- 후보 목록에 없는 이름은 streamerName으로 반환하지 말라.
- 이미지 속 "Art by", "illust", "designer", "art by.", 워터마크, 작가명, 크레딧명, 캐릭터명, 장식 텍스트는 streamerName으로 사용하지 말라.
- 공지 링크는 추출 대상이 아니다.

[추출 대상]
이미지 안의 각 일정마다 아래 정보를 추출하라.
- title
- streamerName
- date
- startTime
- endTime
- isAllDay
- categories
- memo

[필드 규칙]

1. title
- 이미지에 있는 제목 텍스트를 최대한 그대로 추출하라.
- 띄어쓰기/문장부호도 가능한 한 원문을 유지하라.
- 자연스럽게 다듬거나 요약하거나 바꾸지 말라.
- 일정 자체가 불명확하면 해당 일정은 반환하지 말라.
- 아래와 같은 명시적 휴방/비방송 일정은 제외하라.
  - "휴방", "휴방입니다", "쉬어가요", "쉬는시간", "OFFLINE", "Loading", "휴일이에요"
- 단순 장식 문구, 헤더 문구, 공지 문구는 title로 사용하지 말라.

2. streamerName
- 반드시 사용자가 입력한 스트리머 후보 목록 안에서만 선택하라.
- 사용자가 입력한 스트리머가 1명이라면 그 이름을 사용하라.
- 여러 명일 경우에만 후보 중 하나를 선택하라.
- 후보 중 어떤 스트리머인지 판단할 수 없으면 null로 반환하라.
- 이미지 속 작가명/디자이너명/크레딧명/워터마크를 streamerName으로 반환하지 말라.

3. date
- 반드시 YYYY-MM-DD 형식으로 반환하라.
- 날짜 결정은 아래 우선순위를 따른다.

[date 우선순위 규칙]
A. 이미지에 연/월/일이 모두 보이면 그대로 사용한다.
B. 연도가 없고 월/일이 보이면 currentYear를 사용한다.
C. 연도와 월이 없고 일(day number)만 보이면 currentYear-currentMonth-DD를 사용한다.
D. 이미지에 주간 범위(예: 0316~0322, 3/16~3/22, 2026.03.16~03.22)가 있으면 그 범위를 기준으로 각 일정의 날짜를 계산한다.
E. 이미지에 요일과 일자 숫자가 함께 있으면, 보이는 일자 숫자를 기준으로 currentYear/currentMonth를 보완해 날짜를 만든다.
F. 이미지에 요일만 있고 일자 숫자도 없고 주간 범위도 없으면 date는 null로 반환한다.

추가 규칙:
- 대부분의 일정표는 현재 주간/현재 월 기준이므로, 월 정보가 보이지 않으면 currentMonth를 사용하라.
- 연도는 이미지에 없으면 반드시 currentYear를 사용하라.
- 2024, 2025 같은 과거 연도를 임의로 추정하지 말라.
- 날짜가 애매하더라도 day number가 명확하면 currentYear-currentMonth-DD 형식으로 반환하라.

4. startTime
- 반드시 HH:mm 24시간 형식으로 반환하라.
- 예:
  - 오후 7시 -> 19:00
  - 7PM -> 19:00
  - PM07:00 -> 19:00
  - 6:00pm -> 18:00
  - 오후6시 -> 18:00
- 시작 시간을 명확히 찾을 수 없으면 null로 반환하라.

5. endTime
- 반드시 HH:mm 24시간 형식으로 반환하라.
- 종료 시간이 명확히 보일 때만 채워라.
- 보이지 않으면 null로 반환하라.

6. isAllDay
- date는 있지만 startTime이 없으면 true로 반환하라.
- startTime이 있으면 false로 반환하라.
- date가 null이면 false로 반환하라.

7. categories
- 제목을 분석해서 아래 카테고리 중 1개 이상 선택하라.
- 복수 선택 가능하다.
- 사용할 수 있는 카테고리 값은 아래 8개뿐이다.
  - "토크"
  - "게임"
  - "합방"
  - "콘텐츠"
  - "대회"
  - "음악/노래"
  - "광고"
  - "같이보기"
- 제목과 이미지 문맥으로 명확히 판단 가능한 경우만 넣어라.
- 확신할 수 없으면 ["토크"]를 반환하라.

카테고리 예시:
- "카페 탐방" -> ["토크"]
- "영도 데이" -> ["토크"]
- "마인크래프트 대규모 합방" -> ["게임", "합방"]
- "광고) 도미노 피자와 함께..." -> ["광고"]
- "노래 방송" -> ["음악/노래"]
- "영화 같이 보기" -> ["같이보기"]
- "발로란트 5대5 스크림" -> ["게임", "대회"]

8. memo
- 항상 null로 반환하라.

[중복/분할 인식 방지 규칙]
- 같은 일정이 이미지 내에서 여러 텍스트 블록으로 보이더라도 하나의 일정으로 합쳐라.
- 아래 값이 동일하거나 사실상 같은 일정이면 하나만 반환하라.
  - 같은 date
  - 같은 startTime 또는 둘 다 시간 없음
  - 같은 title 또는 실질적으로 동일한 제목
  - 같은 streamerName
- 같은 일정의 일부 조각만 따로따로 반환하지 말라.

[반환할 일정 판단 기준]
- 일정이라고 볼 수 있는 최소 단위가 성립할 때만 반환하라.
- 날짜/시간/제목/스트리머 중 일부가 비어 있을 수는 있지만, 이미지상 "하나의 방송 일정"이라고 볼 근거가 있어야 한다.
- 단순 장식 텍스트, 섹션 제목, 공지 문구, 안내 문구는 일정으로 반환하지 말라.

[출력 형식]
반드시 아래 형식의 JSON 배열만 반환하라.

[
  {
    "title": "마인크래프트 대규모 합방",
    "streamerName": "풍월량",
    "date": "2026-01-01",
    "startTime": "19:00",
    "endTime": null,
    "isAllDay": false,
    "categories": ["게임", "합방"],
    "memo": null
  }
]

[출력 제약]
- JSON 배열만 반환
- 마크다운 코드블록 금지
- 설명 문장 금지
- 주석 금지
- trailing comma 금지
- 키 이름은 정확히 아래만 사용
  - title
  - streamerName
  - date
  - startTime
  - endTime
  - isAllDay
  - categories
  - memo
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

    const currentYear = new Date().getFullYear()
    const normalizeDateYear = (dateStr: string | null) => {
      if (!dateStr) return null;
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return dateStr;
      const [, , month, day] = match;
      return `${currentYear}-${month}-${day}`;
    }

    // 프론트의 ExtractedScheduleDraft 형식으로 매핑
    const drafts: ExtractedScheduleDraft[] = parsedData.map((item, index) => {
      
      // 강제 연도 보정 적용
      const normalizedDate = normalizeDateYear(item.date) || null;
      
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
        status: status,
      }
    })

    return { data: drafts }
  } catch (error: any) {
    console.error("Gemini Extraction APIs Error:", error)
    return { error: "AI 일정 추출에 실패했어요. 잠시 후 다시 시도해주세요." }
  }
}
