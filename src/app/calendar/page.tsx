import * as React from "react"
import { CalendarClient } from "./calendar-client"
import { getCachedCalendarMonthSchedules, getCachedCalendarDaySchedules } from "@/lib/calendar-data"
import { getFavoriteStreamerIdsByUserId } from "@/app/actions/schedules"
import { getServerUser } from "@/lib/auth/server-user"
import { parseISO, format } from "date-fns"
import { CoupangBanner } from "@/components/ads/CoupangBanner"

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams;
  
  const scope = (typeof sp.scope === 'string' ? sp.scope : 'all') as 'all' | 'favorites';
  const rawView = typeof sp.view === 'string' ? sp.view : null;
  const rawDate = typeof sp.date === 'string' ? sp.date : null;

  const date = rawDate ? parseISO(rawDate) : new Date();
  if (isNaN(date.getTime())) {
    date.setTime(new Date().getTime());
  }

  // 데스크톱/서버의 기본 뷰를 'month'로 설정. 
  // (모바일일 경우 CSR에서 'day'로 router.replace 가 수행될 수 있음)
  const view = (rawView === 'day' || rawView === 'month') ? rawView : (rawView === 'week' ? 'day' : 'month');

  let initialEvents = [];
  
  // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
  const timerLabel = `Calendar_Server_Initial_Data_${Math.random().toString(36).slice(2, 7)}`;
  console.time(timerLabel);
  if (view === 'month') {
    const monthStr = format(date, 'yyyy-MM');
    const res = await getCachedCalendarMonthSchedules(monthStr);
    initialEvents = res.data || [];
  } else {
    const dayStr = format(date, 'yyyy-MM-dd');
    
    // Server Prefetch for day view
    // (서버에서 페이지를 그릴 때 이전, 다음 날짜 캐시도 채워두기 위해 비동기로 호출)
    const prevDayStr = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd');
    const nextDayStr = format(new Date(date.getTime() + 86400000), 'yyyy-MM-dd');
    getCachedCalendarDaySchedules(prevDayStr).catch(() => {});
    getCachedCalendarDaySchedules(nextDayStr).catch(() => {});

    const res = await getCachedCalendarDaySchedules(dayStr);
    initialEvents = res.data || [];
  }
  console.timeEnd(timerLabel);

  // 즐겨찾기 필터 모드일 경우 로그인 유저의 즐겨찾기 ID 목록을 서버에서 미리 주입
  let initialFavoriteIds: string[] = [];
  if (scope === 'favorites') {
    const user = await getServerUser();
    if (user) {
      initialFavoriteIds = await getFavoriteStreamerIdsByUserId(user.id);
    }
  }

  return (
    <CalendarClient 
      initialEvents={initialEvents}
      initialFavoriteIds={initialFavoriteIds}
      initialDate={date}
      initialView={view}
      initialScope={scope}
      topAd={<CoupangBanner placementKey="calendar_top" />}
      filterAd={<CoupangBanner placementKey="calendar_filter_bottom" className="hidden lg:flex" />}
    />
  )
}
