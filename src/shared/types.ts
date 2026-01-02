import type { CHAT_PROVIDER_ID, STT_PROVIDER_ID } from "."

export type RecordingHistoryItem = {
  id: string
  createdAt: number
  duration: number
  transcript: string
}

export type Config = {
  shortcut?: "hold-ctrl" | "ctrl-slash" | "ctrl-alt-shift-comma"
  hideDockIcon?: boolean

  sttProviderId?: STT_PROVIDER_ID
  sttModel?: string // Custom STT model name

  openaiApiKey?: string
  openaiBaseUrl?: string

  groqApiKey?: string
  groqBaseUrl?: string

  geminiApiKey?: string
  geminiBaseUrl?: string

  transcriptPostProcessingEnabled?: boolean
  transcriptPostProcessingProviderId?: CHAT_PROVIDER_ID
  transcriptPostProcessingPrompt?: string
  chatModel?: string // Custom chat/LLM model name
}
