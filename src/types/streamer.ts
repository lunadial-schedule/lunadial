export type VerifiedMarkType = "PARTNER" | "CHALLENGER" | string;

export interface StreamerShortInfo {
  id: string;
  name: string;
  image_url?: string | null;
  verified_mark?: boolean;
  verified_mark_type?: VerifiedMarkType | null;
  channel_id?: string | null;
  channel_url?: string | null;
}
