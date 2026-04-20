"use client"

import * as React from "react"
import type { ExtractedScheduleDraft } from "./ai-extraction-form";
import { AiExtractionForm } from "./ai-extraction-form"
import { AiExtractionResults } from "./ai-extraction-results"
import type { StreamerShortInfo } from "@/types/streamer"

interface AiExtractionTabProps {
  onOpenChange: (open: boolean) => void
}

export function AiExtractionTab({ onOpenChange }: AiExtractionTabProps) {
  const [results, setResults] = React.useState<ExtractedScheduleDraft[] | null>(null)
  const [payload, setPayload] = React.useState<{ streamers: StreamerShortInfo[], link: string } | null>(null)

  const handleExtractionComplete = (extractedData: ExtractedScheduleDraft[], originalPayload: { streamers: StreamerShortInfo[], link: string }) => {
    setResults(extractedData)
    setPayload(originalPayload)
  }

  const handleReset = () => {
    setResults(null)
    setPayload(null)
  }

  return (
    <>
      {!results ? (
        <AiExtractionForm 
          onExtractionComplete={handleExtractionComplete} 
          onCancel={() => onOpenChange(false)} 
        />
      ) : (
        <AiExtractionResults 
          results={results}
          payload={payload!}
          onBack={handleReset}
          onComplete={() => onOpenChange(false)}
        />
      )}
    </>
  )
}
