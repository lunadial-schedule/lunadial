"use client"

import * as React from "react"
import { AiExtractionForm, ExtractedScheduleDraft } from "./ai-extraction-form"
import { AiExtractionResults } from "./ai-extraction-results"

interface AiExtractionTabProps {
  onOpenChange: (open: boolean) => void
}

export function AiExtractionTab({ onOpenChange }: AiExtractionTabProps) {
  const [results, setResults] = React.useState<ExtractedScheduleDraft[] | null>(null)
  const [payload, setPayload] = React.useState<{ streamers: string[], link: string } | null>(null)

  const handleExtractionComplete = (extractedData: ExtractedScheduleDraft[], originalPayload: { streamers: string[], link: string }) => {
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
