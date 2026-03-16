"use server"

/**
 * 일정 자동 파싱 Server Action (Gemini AI)
 *
 * 사용자가 입력한 URL의 웹페이지 내용을 Gemini AI로 분석하여
 * 방송 일정 정보(제목, 시작 시각, 카테고리)를 자동 추출한다.
 */
import { GEMINI_API_KEY } from "@/config/env"
import { GoogleGenAI } from "@google/genai"

/** AI 파싱 결과 타입 */
export interface ParseResult {
  title: string
  startAt: string // ISO (YYYY-MM-DDTHH:mm)
  category: "컨텐츠" | "합방" | "대회" | "기타"
  streamerId?: string
}

/**
 * URL과 HTML 내용을 Gemini AI로 분석하여 일정 정보를 추출한다.
 * @param url - 일정 소스 URL
 * @param htmlContent - 웹페이지 HTML 텍스트
 * @returns 추출된 일정 정보 (제목, 시작 시각, 카테고리)
 */
export async function parseScheduleFromLink(url: string, htmlContent: string): Promise<ParseResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const prompt = `
당신은 치지직 스트리머의 방송 일정을 파싱하는 AI 어시스턴트입니다.
사용자가 제공한 웹페이지 본문 내용(HTML/Text)과 URL 주소를 바탕으로 핵심 일정을 추출해주세요.

[입력 URL]: ${url}
[웹페이지 내용]:
${htmlContent.slice(0, 5000)} // 토큰 초과 방지를 위해 5000자로 제한

이 데이터에서 다음 필드를 추출하여 오직 JSON 형식으로만 반환하세요:
{
  "title": "방송 제목 또는 요약된 내용",
  "startAt": "YYYY-MM-DDTHH:mm 형태의 시작 시간",
  "category": "컨텐츠", "합방", "대회", "기타" 중 하나
}
절대로 다른 텍스트는 덧붙이지 마세요. 만약 추출할 수 없다면 적절한 기본값을 넣어주세요.
`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })

    if (!response.text) throw new Error("예상치 못한 응답")
    
    // JSON 마크다운 래핑 제거 후 파싱
    let resultText = response.text
    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim()
    }
    const data = JSON.parse(resultText) as ParseResult
    
    // 필드 누락 시 기본값 적용
    if (!data.title) data.title = "제목 없음"
    if (!data.category) data.category = "컨텐츠"
    if (!data.startAt) data.startAt = new Date().toISOString().slice(0, 16)

    return data
  } catch (error) {
    console.error("Gemini 파싱 에러:", error)
    throw new Error("정보 추출에 실패했습니다.")
  }
}
