export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID || ''
export const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET || ''
export const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET || ''
export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || ''
export const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || ''
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || ''

// App configuration and limits
export const RATE_LIMIT = {
  SCHEDULE_CREATE: 30,
  SCHEDULE_UPDATE: 30
}
