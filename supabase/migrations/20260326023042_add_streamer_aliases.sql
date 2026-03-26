-- Add aliases array and normalized_aliases array to public.streamers table
ALTER TABLE public.streamers ADD COLUMN aliases text[] DEFAULT '{}'::text[];
ALTER TABLE public.streamers ADD COLUMN normalized_aliases text[] DEFAULT '{}'::text[];

-- Create GIN indexes for efficient array searching
CREATE INDEX IF NOT EXISTS idx_streamers_aliases ON public.streamers USING GIN (aliases);
CREATE INDEX IF NOT EXISTS idx_streamers_normalized_aliases ON public.streamers USING GIN (normalized_aliases);
