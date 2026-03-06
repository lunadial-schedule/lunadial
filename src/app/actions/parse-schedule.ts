"use server"

import { GEMINI_API_KEY } from "@/config/env"
import { GoogleGenAI } from "@google/genai"

export interface ParseResult {
  title: string
  startAt: string // ISO (YYYY-MM-DDTHH:mm)
  category: "컨텐츠" | "합방" | "대회" | "기타"
  streamerId?: string
}

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
${htmlContent.slice(0, 5000)} // 길이를 제한하여 토큰 초과 방지

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
    
    // 파싱 시도
    let resultText = response.text
    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim()
    }
    const data = JSON.parse(resultText) as ParseResult
    
    // Fallback 로직 (필드가 빠져있을 경우)
    if (!data.title) data.title = "제목 없음"
    if (!data.category) data.category = "컨텐츠"
    if (!data.startAt) data.startAt = new Date().toISOString().slice(0, 16)

    return data
  } catch (error) {
    console.error("Gemini Parsing Error", error)
    throw new Error("정보 추출에 실패했습니다.")
  }
}
