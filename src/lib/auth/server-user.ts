import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * 서버 환경(React Server Components, SSR, Server Actions)에서 
 * 현재 로그인한 사용자를 조회하는 공통 헬퍼입니다.
 * 
 * React `cache`를 적용하여, 동일한 렌더링/요청 사이클 내에서 
 * 여러 번 호출되더라도 Supabase API는 한 번만 호출되도록 최적화합니다.
 */
export const getServerUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // 세션이 없거나 만료된 일반적인 상황이면 조용히 null 반환
      return null;
    }
    
    return user ?? null;
  } catch (error) {
    console.error('[getServerUser] Error:', error);
    return null;
  }
});
