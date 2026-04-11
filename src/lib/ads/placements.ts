/**
 * 광고 노출 위치별 설정.
 * 광고 코드 유지보수를 용이하게 하기 위해 모든 위치를 여기서 중앙 집중화하여 관리합니다.
 */

export interface AdPlacementConfig {
  iframeSrc?: string;
  desktopHeight: number;
  mobileHeight: number;
  lazy: boolean;
}

export type AdPlacementKey = 
  | 'home_top'
  | 'home_bottom'
  | 'calendar_top'
  | 'calendar_filter_bottom'
  | 'favorites_top';

export const placements: Record<AdPlacementKey, AdPlacementConfig> = {
  home_top: {
    iframeSrc: process.env.NEXT_PUBLIC_COUPANG_HOME_TOP_IFRAME,
    desktopHeight: 90,
    mobileHeight: 100,
    lazy: false, // 최상단 노출이므로 빠른 로딩
  },
  home_bottom: {
    iframeSrc: process.env.NEXT_PUBLIC_COUPANG_HOME_BOTTOM_IFRAME,
    desktopHeight: 90,
    mobileHeight: 100,
    lazy: true, // 하단 노출이므로 지연 로딩
  },
  calendar_top: {
    iframeSrc: process.env.NEXT_PUBLIC_COUPANG_CALENDAR_TOP_IFRAME,
    desktopHeight: 90,
    mobileHeight: 100,
    lazy: false,
  },
  calendar_filter_bottom: {
    iframeSrc: process.env.NEXT_PUBLIC_COUPANG_CALENDAR_FILTER_IFRAME,
    desktopHeight: 250, // 일반적으로 사이드 필터는 300x250 형태를 권장
    mobileHeight: 0, // 사이드바는 모바일에서 바텀시트로 표시되므로 보통 렌더링 안 하거나 0으로 취급
    lazy: true,
  },
  favorites_top: {
    iframeSrc: process.env.NEXT_PUBLIC_COUPANG_FAVORITES_TOP_IFRAME,
    desktopHeight: 90,
    mobileHeight: 100,
    lazy: true,
  },
};
