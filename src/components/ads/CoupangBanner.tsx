import { isAdFree } from "@/lib/subscription/isAdFree";
import { placements, AdPlacementKey } from "@/lib/ads/placements";
import { AdSlot } from "./AdSlot";

interface Props {
  placementKey: AdPlacementKey;
  className?: string;
}

/**
 * Server Component 래퍼
 * 클라이언트나 서버에서 이 컴포넌트를 사용하면, 서버단에서 현재 사용자의 구독 상태를 조회합니다.
 * Pro 사용자의 경우 광고 슬롯 및 공백 요소를 일절 렌더링하지 않습니다.
 */
export async function CoupangBanner({ placementKey, className }: Props) {
  const adFree = await isAdFree();
  
  if (adFree) {
    return null; // 완전히 차단. DOM과 여백 전혀 없음
  }

  const config = placements[placementKey];
  if (!config || !config.iframeSrc) {
    return null; // 환경변수가 미설정이거나 키가 잘못된 경우 미노출
  }

  return (
    <AdSlot
      iframeSrc={config.iframeSrc}
      desktopHeight={config.desktopHeight}
      mobileHeight={config.mobileHeight}
      lazy={config.lazy}
      className={className}
    />
  );
}
