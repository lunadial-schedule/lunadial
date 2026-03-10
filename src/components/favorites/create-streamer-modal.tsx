"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"
import { STREAMER_PLACEHOLDERS } from "@/config/placeholders"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { findOrCreateStreamer } from "@/app/actions/streamers"
import { addFavorite } from "@/app/actions/favorites"

const formSchema = z.object({
  name: z.string().min(1, "스트리머 이름을 입력해주세요.").max(50, "이름이 너무 깁니다."),
  channelUrl: z.string().url("올바른 URL 형식을 입력해주세요.").optional().or(z.literal("")),
  imageUrl: z.string().url("올바른 URL 형식을 입력해주세요.").optional().or(z.literal("")),
})

interface CreateStreamerModalProps {
  initialSearchQuery?: string
  onSuccess?: () => void
}

export function CreateStreamerModal({ initialSearchQuery = "", onSuccess }: CreateStreamerModalProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  
  const [streamerPlaceholder, setStreamerPlaceholder] = React.useState("예: 릴카")
  const prevStreamerRef = React.useRef<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialSearchQuery,
      channelUrl: "",
      imageUrl: "",
    },
  })

  // Watch for open state changes to reset form
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: initialSearchQuery,
        channelUrl: "",
        imageUrl: "",
      })

      let newStreamer = STREAMER_PLACEHOLDERS[Math.floor(Math.random() * STREAMER_PLACEHOLDERS.length)]
      while (STREAMER_PLACEHOLDERS.length > 1 && newStreamer === prevStreamerRef.current) {
        newStreamer = STREAMER_PLACEHOLDERS[Math.floor(Math.random() * STREAMER_PLACEHOLDERS.length)]
      }
      setStreamerPlaceholder(newStreamer)
      prevStreamerRef.current = newStreamer
    }
  }, [open, initialSearchQuery, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      // 1. 스트리머 생성 또는 기존 찾기
      const res = await findOrCreateStreamer({
        name: values.name,
        channelUrl: values.channelUrl || undefined,
        imageUrl: values.imageUrl || undefined,
      })

      if (res.error || !res.data) {
        throw new Error(res.error || "스트리머 생성에 실패했습니다.")
      }

      const streamerId = res.data.id

      if (!res.isNew) {
        toast.info("이미 동일한 이름의 스트리머가 등록되어 있어 기존 정보를 연결합니다.")
      }

      // 2. 즉시 즐겨찾기 연동
      const favRes = await addFavorite(streamerId)
      
      // 즐겨찾기 이미 되어있을 경우 등도 에러로 올 수 있으나 Toast만 띄우고 성공 처리
      if (favRes.error) {
        toast.error(favRes.error)
      } else {
        toast.success(`'${res.data.name}'을(를) 즐겨찾기에 추가했습니다!`)
        window.dispatchEvent(new Event("favoritesUpdated"))
      }

      setOpen(false)
      if (onSuccess) onSuccess()

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed my-2">
          <Plus className="mr-2 h-4 w-4" />
          직접 스트리머 추가하기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>직접 스트리머 추가</DialogTitle>
          <DialogDescription>
            찾으시는 스트리머가 목록에 없다면 직접 등록한 후 바로 즐겨찾기에 추가할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>스트리머 *</FormLabel>
                  <FormControl>
                    <Input placeholder={streamerPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="channelUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>채널 주소</FormLabel>
                  <FormControl>
                    <Input placeholder="https://chzzk.naver.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로필 이미지 URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                추가 및 즐겨찾기
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
