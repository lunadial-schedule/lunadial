/**
 * 푸시 알림 관련 타입 정의
 */

export interface NotificationPreferences {
  user_id: string;
  notify_live_start: boolean;
  notify_schedule_change: boolean;
  notify_notice: boolean;
  live_reminder_minutes: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null; // HH:mm:ss
  quiet_hours_end: string | null;   // HH:mm:ss
  created_at?: string;
  updated_at?: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: any;
}

export interface NotificationDelivery {
  id: string;
  user_id: string;
  subscription_id: string | null;
  schedule_id: string | null;
  type: 'live_start' | 'schedule_changed' | 'notice' | 'test' | 'schedule_live_reminder';
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
  status: 'sent' | 'failed' | 'skipped';
  error_message: string | null;
  sent_at: string;
}
