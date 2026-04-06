import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getServerUser } from "@/lib/auth/server-user";

export async function getActorDetails() {
  const user = await getServerUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = roleData?.role || 'user';
  const nickname = user.user_metadata?.name || '사용자';

  let ip = 'Unknown';
  let maskedIp: string | null = '***';
  
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    ip = forwardedFor ? forwardedFor.split(',')[0].trim() : headersList.get('x-real-ip') || 'Unknown';
    
    if (ip !== 'Unknown') {
      if (ip.includes('.')) {
        const parts = ip.split('.');
        maskedIp = `${parts[0]}.***.***.${parts[parts.length - 1]}`;
      } else if (ip.includes(':')) {
        const parts = ip.split(':');
        maskedIp = `${parts[0]}:***:***:${parts[parts.length - 1]}`;
      }
    }
  } catch (e) {
    // headers() might fail in some NextJS edge cases
  }

  return {
    userId: user.id,
    nickname,
    role,
    maskedIp,
    ip
  };
}
