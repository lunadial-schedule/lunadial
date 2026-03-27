/**
 * 방송 카테고리 정의
 *
 * 일정 등록 시 사용하는 방송 카테고리 목록.
 * 각 카테고리에는 고유 ID, 표시 라벨, Tailwind CSS 색상 클래스가 포함된다.
 */
export const CATEGORIES = {
  TALK: { id: "talk", label: "토크", color: "bg-blue-500", text: "text-blue-500", border: "border-blue-500" },
  GAME: { id: "game", label: "게임", color: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500" },
  COLLAB: { id: "collab", label: "합방", color: "bg-purple-500", text: "text-purple-500", border: "border-purple-500" },
  CONTENT: { id: "content", label: "컨텐츠", color: "bg-orange-500", text: "text-orange-500", border: "border-orange-500" },
  TOURNAMENT: { id: "tournament", label: "대회", color: "bg-yellow-500", text: "text-yellow-500", border: "border-yellow-500" },
  MUSIC: { id: "music", label: "음악/노래", color: "bg-pink-500", text: "text-pink-500", border: "border-pink-500" },
  AD: { id: "ad", label: "광고", color: "bg-gray-500", text: "text-gray-500", border: "border-gray-500" },
  WATCH: { id: "watch", label: "같이보기", color: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500" },
} as const;

/** 카테고리 키 타입 (예: 'TALK' | 'GAME' | ...) */
export type CategoryId = keyof typeof CATEGORIES;

/** 카테고리 배열 (드롭다운 등 반복 렌더링용) */
export const CATEGORY_LIST = Object.values(CATEGORIES);

/**
 * 한글 라벨로 카테고리를 찾는다.
 * 일치하는 카테고리가 없으면 기본값(TALK)을 반환한다.
 */
export function getCategoryByLabel(label: string) {
  return CATEGORY_LIST.find((cat) => cat.label === label) || CATEGORIES.TALK;
}
