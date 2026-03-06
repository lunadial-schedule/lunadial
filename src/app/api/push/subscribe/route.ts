import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/config/env'
import { createClient } from '@/lib/supabase/server'

// VAPID keys setup
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@lunadial.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await req.json()

    // In a real app, save 'subscription' to DB (e.g., users table or a separate push_subscriptions table)
    // For MVP, we pretend it's saved.
    // Example: await supabase.from('push_subscriptions').insert({ user_id: user.id, subscription })

    console.log('User Subscribed to Web Push:', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving subscription', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
