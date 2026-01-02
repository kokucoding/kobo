import fs from "fs"
import { getRendererHandlers, tipc } from "@egoist/tipc/main"
import { showPanelWindow, WINDOWS } from "./window"
import {
  app,
  clipboard,
  Menu,
  shell,
  systemPreferences,
  dialog,
} from "electron"
import path from "path"
import { configStore, recordingsFolder, pendingRecordingsFolder } from "./config"
import { Config, RecordingHistoryItem } from "../shared/types"
import { RendererHandlers } from "./renderer-handlers"
import { postProcessTranscript } from "./llm"
import { state } from "./state"
import { updateTrayIcon } from "./tray"
import { isAccessibilityGranted } from "./utils"
import { writeText } from "./keyboard"
import {
  addReminder,
  getAllReminders,
  deleteReminder as deleteReminderFromFile,
  parseReminderTime,
  Reminder,
} from "./reminders"

const t = tipc.create()

const getRecordingHistory = () => {
  try {
    const history = JSON.parse(
      fs.readFileSync(path.join(recordingsFolder, "history.json"), "utf8"),
    ) as RecordingHistoryItem[]

    // sort desc by createdAt
    return history.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

const saveRecordingsHitory = (history: RecordingHistoryItem[]) => {
  fs.writeFileSync(
    path.join(recordingsFolder, "history.json"),
    JSON.stringify(history),
  )
}

// --- Pending Recordings Helpers (for crash recovery) ---
type PendingRecordingItem = {
  id: string
  createdAt: number
  duration: number
}

const getPendingRecordings = (): PendingRecordingItem[] => {
  try {
    fs.mkdirSync(pendingRecordingsFolder, { recursive: true })
    const files = fs.readdirSync(pendingRecordingsFolder).filter(f => f.endsWith('.webm'))
    const items = files.map(f => {
      const id = path.basename(f, '.webm')
      const stats = fs.statSync(path.join(pendingRecordingsFolder, f))
      return { id, createdAt: stats.mtimeMs, duration: 0 }
    })
    // Sort by createdAt descending and return last 3
    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
  } catch {
    return []
  }
}

const savePendingRecording = (id: string, buffer: ArrayBuffer) => {
  fs.mkdirSync(pendingRecordingsFolder, { recursive: true })
  fs.writeFileSync(path.join(pendingRecordingsFolder, `${id}.webm`), Buffer.from(buffer))
}

const deletePendingRecording = (id: string) => {
  try {
    fs.unlinkSync(path.join(pendingRecordingsFolder, `${id}.webm`))
  } catch { /* ignore if not exists */ }
}

export const router = {
  restartApp: t.procedure.action(async () => {
    app.relaunch()
    app.quit()
  }),

  getUpdateInfo: t.procedure.action(async () => {
    const { getUpdateInfo } = await import("./updater")
    return getUpdateInfo()
  }),

  quitAndInstall: t.procedure.action(async () => {
    const { quitAndInstall } = await import("./updater")

    quitAndInstall()
  }),

  checkForUpdatesAndDownload: t.procedure.action(async () => {
    const { checkForUpdatesAndDownload } = await import("./updater")

    return checkForUpdatesAndDownload()
  }),

  openMicrophoneInSystemPreferences: t.procedure.action(async () => {
    await shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
    )
  }),

  hidePanelWindow: t.procedure.action(async () => {
    const panel = WINDOWS.get("panel")

    panel?.hide()
  }),

  showContextMenu: t.procedure
    .input<{ x: number; y: number; selectedText?: string }>()
    .action(async ({ input, context }) => {
      const items: Electron.MenuItemConstructorOptions[] = []

      if (input.selectedText) {
        items.push({
          label: "Copy",
          click() {
            clipboard.writeText(input.selectedText || "")
          },
        })
      }

      if (import.meta.env.DEV) {
        items.push({
          label: "Inspect Element",
          click() {
            context.sender.inspectElement(input.x, input.y)
          },
        })
      }

      const panelWindow = WINDOWS.get("panel")
      const isPanelWindow = panelWindow?.webContents.id === context.sender.id

      if (isPanelWindow) {
        items.push({
          label: "Close",
          click() {
            panelWindow?.hide()
          },
        })
      }

      const menu = Menu.buildFromTemplate(items)
      menu.popup({
        x: input.x,
        y: input.y,
      })
    }),

  getMicrophoneStatus: t.procedure.action(async () => {
    return systemPreferences.getMediaAccessStatus("microphone")
  }),

  isAccessibilityGranted: t.procedure.action(async () => {
    return isAccessibilityGranted()
  }),

  requestAccesssbilityAccess: t.procedure.action(async () => {
    if (process.platform === "win32") return true

    return systemPreferences.isTrustedAccessibilityClient(true)
  }),

  requestMicrophoneAccess: t.procedure.action(async () => {
    return systemPreferences.askForMediaAccess("microphone")
  }),

  showPanelWindow: t.procedure.action(async () => {
    showPanelWindow()
  }),

  displayError: t.procedure
    .input<{ title?: string; message: string }>()
    .action(async ({ input }) => {
      dialog.showErrorBox(input.title || "Error", input.message)
    }),

  createRecording: t.procedure
    .input<{
      recording: ArrayBuffer
      duration: number
    }>()
    .action(async ({ input }) => {
      // Validate audio is not empty
      if (!input.recording || input.recording.byteLength === 0) {
        throw new Error("Recording is empty. Please try speaking louder or check your microphone.")
      }

      // Minimum audio size check (at least 1KB for a valid recording)
      if (input.recording.byteLength < 1024) {
        throw new Error("Recording is too short. Please speak for at least 1 second.")
      }

      // Save recording to pending folder FIRST (for crash recovery)
      const pendingId = Date.now().toString()
      savePendingRecording(pendingId, input.recording)

      fs.mkdirSync(recordingsFolder, { recursive: true })

      const config = configStore.get()
      const form = new FormData()
      form.append(
        "file",
        new File([input.recording], "recording.webm", { type: "audio/webm" }),
      )
      form.append(
        "model",
        config.sttModel || (config.sttProviderId === "groq" ? "whisper-large-v3" : "whisper-1"),
      )
      form.append("response_format", "json")

      const groqBaseUrl = config.groqBaseUrl || "https://api.groq.com/openai/v1"
      const openaiBaseUrl = config.openaiBaseUrl || "https://api.openai.com/v1"

      const transcriptResponse = await fetch(
        config.sttProviderId === "groq"
          ? `${groqBaseUrl}/audio/transcriptions`
          : `${openaiBaseUrl}/audio/transcriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.sttProviderId === "groq" ? config.groqApiKey : config.openaiApiKey}`,
          },
          body: form,
        },
      )

      if (!transcriptResponse.ok) {
        const message = `${transcriptResponse.statusText} ${(await transcriptResponse.text()).slice(0, 300)}`

        throw new Error(message)
      }

      const json: { text: string } = await transcriptResponse.json()
      const transcript = await postProcessTranscript(json.text)

      const history = getRecordingHistory()
      const item: RecordingHistoryItem = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        duration: input.duration,
        transcript,
      }
      history.push(item)
      saveRecordingsHitory(history)

      fs.writeFileSync(
        path.join(recordingsFolder, `${item.id}.webm`),
        Buffer.from(input.recording),
      )

      // Transcription succeeded, delete pending copy
      deletePendingRecording(pendingId)

      const main = WINDOWS.get("main")
      if (main) {
        getRendererHandlers<RendererHandlers>(
          main.webContents,
        ).refreshRecordingHistory.send()
      }

      const panel = WINDOWS.get("panel")
      if (panel) {
        panel.hide()
      }

      // paste
      clipboard.writeText(transcript)
      if (isAccessibilityGranted()) {
        await writeText(transcript)
      }
    }),

  getRecordingHistory: t.procedure.action(async () => getRecordingHistory()),

  deleteRecordingItem: t.procedure
    .input<{ id: string }>()
    .action(async ({ input }) => {
      const recordings = getRecordingHistory().filter(
        (item) => item.id !== input.id,
      )
      saveRecordingsHitory(recordings)
      fs.unlinkSync(path.join(recordingsFolder, `${input.id}.webm`))
    }),

  deleteRecordingHistory: t.procedure.action(async () => {
    fs.rmSync(recordingsFolder, { force: true, recursive: true })
  }),

  getConfig: t.procedure.action(async () => {
    return configStore.get()
  }),

  saveConfig: t.procedure
    .input<{ config: Config }>()
    .action(async ({ input }) => {
      configStore.save(input.config)
    }),

  recordEvent: t.procedure
    .input<{ type: "start" | "end" }>()
    .action(async ({ input }) => {
      if (input.type === "start") {
        state.isRecording = true
      } else {
        state.isRecording = false
      }
      updateTrayIcon()
    }),

  // --- Pending Recordings IPC (Crash Recovery) ---
  getPendingRecordings: t.procedure.action(async () => getPendingRecordings()),

  recoverPendingRecording: t.procedure
    .input<{ id: string }>()
    .action(async ({ input }) => {
      const pendingPath = path.join(pendingRecordingsFolder, `${input.id}.webm`)
      if (!fs.existsSync(pendingPath)) {
        throw new Error("Pending recording not found")
      }
      const buffer = fs.readFileSync(pendingPath)
      // Create a new recording entry without transcription
      fs.mkdirSync(recordingsFolder, { recursive: true })
      const history = getRecordingHistory()
      const item: RecordingHistoryItem = {
        id: input.id,
        createdAt: Date.now(),
        duration: 0,
        transcript: "[Recovered - Transcription pending]",
      }
      history.push(item)
      saveRecordingsHitory(history)
      fs.writeFileSync(path.join(recordingsFolder, `${item.id}.webm`), buffer)
      deletePendingRecording(input.id)
      return item
    }),

  deletePendingRecording: t.procedure
    .input<{ id: string }>()
    .action(async ({ input }) => {
      deletePendingRecording(input.id)
    }),

  // --- Reminders IPC ---
  setReminder: t.procedure
    .input<{ message: string; timeInput: string }>()
    .action(async ({ input }) => {
      const triggerTime = parseReminderTime(input.timeInput)
      if (!triggerTime) {
        throw new Error(`Could not parse time: "${input.timeInput}". Try "in 5 minutes" or "at 10am".`)
      }
      return addReminder(input.message, triggerTime)
    }),

  getReminders: t.procedure.action(async () => getAllReminders()),

  dismissReminder: t.procedure
    .input<{ id: string }>()
    .action(async ({ input }) => {
      deleteReminderFromFile(input.id)
    }),
}

export type Router = typeof router
