import { cache } from 'react';
import { getServerUser } from '@/lib/auth/server-user';
import { createClient } from '@/lib/supabase/server';

/**
 * 현재 로그인한 사용자가 광고 제거 대상(Pro/Admin 등)인지 확인합니다.
 * Server Components, SSR 등에서 여러 번 호출되어도 캐싱되어 단 한 번만 DB를 조회합니다.
 */
export const isAdFree = cache(async () => {
  try {
    const user = await getServerUser();
    if (!user) return false;

    const supabase = await createClient();
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.role === 'pro' || data?.role === 'admin') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[isAdFree] Error checking ad-free status:', error);
    return false; // 오류 시 기본값: 광고 노출 (보수적)
  }
});
