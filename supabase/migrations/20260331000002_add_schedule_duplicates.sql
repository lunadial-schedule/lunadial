-- 일정 중복 방지 고유 제약 및 예외 처리용 플래그 추가

-- 1. is_duplicate_ignored 플래그 추가
ALTER TABLE "public"."schedules" 
ADD COLUMN "is_duplicate_ignored" boolean NOT NULL DEFAULT false;

-- 2. 스트리머 + 시작시간 + 하루 종일 여부에 대한 Unique Guard (관리자 예외 처리 혹은 삭제된 일정은 제외)
CREATE UNIQUE INDEX idx_schedules_unique_time 
ON "public"."schedules" ("streamer_id", "start_time", "is_all_day") 
WHERE ("is_deleted" = false AND "is_duplicate_ignored" = false);
