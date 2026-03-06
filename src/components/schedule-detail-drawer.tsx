"use client"

import * as React from "react"
import { ExternalLink, Edit2, ShieldAlert, XCircle, Clock } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UpdateScheduleDialog } from "@/components/dashboard/update-schedule-dialog"

import { Schedule, deleteSchedule } from "@/app/actions/schedules"
import { CATEGORY_LIST } from "@/config/categories"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface ScheduleDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
}

export function ScheduleDetailDrawer({
  open,
  onOpenChange,
  schedule
}: ScheduleDetailDrawerProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false);

  const [user, setUser] = React.useState<User | null>(null);
  const supabase = createClient();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!schedule) return null;

  const currentCategories = schedule.categories || [];
  const categoryInfos = currentCategories.map(id => CATEGORY_LIST.find(c => c.id === id)).filter(Boolean) as typeof CATEGORY_LIST;
  if (categoryInfos.length === 0) categoryInfos.push(CATEGORY_LIST[0]);

  const handleUpdateClick = () => {
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    setIsUpdateOpen(true);
  };

  const handleDelete = async () => {
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    const { error } = await deleteSchedule(schedule.id);
    setIsDeleting(false);
    if (error) {
      alert("삭제 실패: " + error);
    } else {
      onOpenChange(false);
      window.dispatchEvent(new Event("schedulesUpdated"));
      router.refresh(); // 삭제 후 화면 즉시 갱신
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] border-l overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
        <SheetHeader className="text-left py-2 border-b pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {categoryInfos.map(info => (
              <Badge key={info.id} variant="default" className="text-[10px] px-1.5 h-4 rounded-sm border-0" style={{ backgroundColor: info.color.replace('bg-', '') }}>
                {info.label}
              </Badge>
            ))}
            {schedule.status === "changed" && <Badge variant="secondary" className="text-[10px] px-1.5 h-4 rounded-sm bg-amber-500 text-white border-0">변경됨</Badge>}
            {schedule.status === "canceled" && <Badge variant="secondary" className="text-[10px] px-1.5 h-4 rounded-sm bg-zinc-500 text-white border-0">취소됨</Badge>}
          </div>
          <SheetTitle className="text-xl font-bold leading-tight">
            {schedule.title}
          </SheetTitle>
          <SheetDescription className="mt-1 flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2 mt-2">
              <Avatar className="h-6 w-6 border">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{schedule.streamer.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{schedule.streamer}</span>
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 flex flex-col gap-8">
          {/* Schedule Meta Data */}
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium mb-1">시간</span>
                <span className="text-sm font-semibold">
                  {schedule.is_all_day 
                    ? format(parseISO(schedule.start_time), "yyyy. M. d (eee)", { locale: ko }) + " · 하루 종일"
                    : format(parseISO(schedule.start_time), "yyyy. M. d (eee) a h:mm", { locale: ko })
                  }
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-muted-foreground font-medium mb-1">공지 링크</span>
                <a href={schedule.link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-500 hover:underline break-all">
                  {schedule.link}
                </a>
              </div>
            </div>
          </div>

          {(schedule.memo && schedule.memo.trim() !== "") && (
            <div className="bg-muted/30 p-5 rounded-xl border border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">상세 메모</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {schedule.memo}
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border/50">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button className="w-full gap-2" variant="outline" size="sm" onClick={handleUpdateClick}>
                <Edit2 className="w-3.5 h-3.5" />
                정보 수정
              </Button>
              <Button 
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" 
                variant="outline" 
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <XCircle className="w-3.5 h-3.5" />
                {isDeleting ? "삭제 중..." : "일정 삭제"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

      <UpdateScheduleDialog 
        open={isUpdateOpen} 
        onOpenChange={setIsUpdateOpen} 
        schedule={schedule}
        onSuccess={() => {
          setIsUpdateOpen(false);
          onOpenChange(false);
          window.dispatchEvent(new Event("schedulesUpdated"));
          router.refresh(); // 수정 성공 후 화면 즉시 갱신
        }} 
      />
    </Sheet>
  )
}
