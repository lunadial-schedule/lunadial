export const CATEGORIES = {
  TALK: { id: "talk", label: "토크", color: "bg-blue-500", text: "text-blue-500", border: "border-blue-500" },
  GAME: { id: "game", label: "게임", color: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500" },
  COLLAB: { id: "collab", label: "합방", color: "bg-purple-500", text: "text-purple-500", border: "border-purple-500" },
  CONTENT: { id: "content", label: "컨텐츠", color: "bg-orange-500", text: "text-orange-500", border: "border-orange-500" },
  TOURNAMENT: { id: "tournament", label: "대회", color: "bg-red-500", text: "text-red-500", border: "border-red-500" },
  MUSIC: { id: "music", label: "음악/노래", color: "bg-pink-500", text: "text-pink-500", border: "border-pink-500" },
  AD: { id: "ad", label: "광고", color: "bg-gray-500", text: "text-gray-500", border: "border-gray-500" },
  WATCH: { id: "watch", label: "같이보기", color: "bg-teal-500", text: "text-teal-500", border: "border-teal-500" },
} as const;

export type CategoryId = keyof typeof CATEGORIES;
export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategoryByLabel(label: string) {
  return CATEGORY_LIST.find((cat) => cat.label === label) || CATEGORIES.TALK;
}
