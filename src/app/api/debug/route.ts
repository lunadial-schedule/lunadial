import { NextResponse } from 'next/server';
import { getCachedSchedules } from '@/lib/dashboard-data';
import { getHomeSchedules } from '@/app/actions/schedules';

export async function GET() {
  try {
    const cached = await getCachedSchedules();
    const directRes = await getHomeSchedules(new Date('2026-04-17'), new Date('2026-04-23'));

    return NextResponse.json({
      cachedSchedulesLength: cached.schedules.length,
      directSchedulesLength: directRes.data?.length,
      firstCached: cached.schedules[0] || null,
      firstDirect: directRes.data?.[0] || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
