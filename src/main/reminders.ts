import fs from "fs"
import path from "path"
import { dialog, Notification, app, BrowserWindow } from "electron"
import { dataFolder } from "./config"

const remindersPath = path.join(dataFolder, "reminders.json")

export type Reminder = {
    id: string
    message: string
    triggerTime: number // Unix timestamp in ms
}

const getReminders = (): Reminder[] => {
    try {
        return JSON.parse(fs.readFileSync(remindersPath, "utf8")) as Reminder[]
    } catch {
        return []
    }
}

const saveReminders = (reminders: Reminder[]) => {
    fs.mkdirSync(dataFolder, { recursive: true })
    fs.writeFileSync(remindersPath, JSON.stringify(reminders))
}

export const addReminder = (message: string, triggerTime: number): Reminder => {
    const reminders = getReminders()
    const reminder: Reminder = {
        id: Date.now().toString(),
        message,
        triggerTime,
    }
    reminders.push(reminder)
    saveReminders(reminders)
    return reminder
}

export const getAllReminders = (): Reminder[] => {
    return getReminders().sort((a, b) => a.triggerTime - b.triggerTime)
}

export const deleteReminder = (id: string) => {
    const reminders = getReminders().filter((r) => r.id !== id)
    saveReminders(reminders)
}

// --- Reminder Polling ---
let reminderInterval: NodeJS.Timeout | null = null
let activeBeepWindow: BrowserWindow | null = null

const playBeepAndShowPopup = (reminder: Reminder) => {
    // Show system notification
    const notification = new Notification({
        title: "Kobo Reminder",
        body: reminder.message,
        silent: false,
    })
    notification.show()

    // Create a tiny popup window with a beeping sound
    activeBeepWindow = new BrowserWindow({
        width: 400,
        height: 200,
        alwaysOnTop: true,
        resizable: false,
        minimizable: false,
        skipTaskbar: false,
        title: "Reminder",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
        }
        .message {
          font-size: 1.2em;
          margin-bottom: 20px;
          text-align: center;
          padding: 0 20px;
        }
        button {
          padding: 10px 30px;
          font-size: 1em;
          background: #40E0D0;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        button:hover {
          background: #2cb8a8;
        }
      </style>
    </head>
    <body>
      <div class="message">${reminder.message}</div>
      <button onclick="window.close()">Dismiss</button>
      <audio id="beep" autoplay loop>
        <source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..." type="audio/wav">
      </audio>
      <script>
        // Generate a simple beep using Web Audio API
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function beep() {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          oscillator.start();
          setTimeout(() => oscillator.stop(), 200);
        }
        // Beep every second
        beep();
        setInterval(beep, 1500);
      </script>
    </body>
    </html>
  `

    activeBeepWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

    activeBeepWindow.on("closed", () => {
        activeBeepWindow = null
        // Delete the reminder after dismissal
        deleteReminder(reminder.id)
    })
}

const checkReminders = () => {
    const now = Date.now()
    const reminders = getReminders()

    for (const reminder of reminders) {
        if (reminder.triggerTime <= now) {
            playBeepAndShowPopup(reminder)
            deleteReminder(reminder.id)
            break // Show one at a time
        }
    }
}

export const startReminderPolling = () => {
    if (reminderInterval) return
    reminderInterval = setInterval(checkReminders, 5000) // Check every 5 seconds
}

export const stopReminderPolling = () => {
    if (reminderInterval) {
        clearInterval(reminderInterval)
        reminderInterval = null
    }
}

// Parse natural language time like "in 5 minutes", "at 10am"
export const parseReminderTime = (input: string): number | null => {
    const now = Date.now()
    const lowerInput = input.toLowerCase().trim()

    // "in X minutes" or "in X mins"
    const inMinutesMatch = lowerInput.match(/in\s+(\d+)\s*(?:minutes?|mins?)/)
    if (inMinutesMatch) {
        const minutes = parseInt(inMinutesMatch[1], 10)
        return now + minutes * 60 * 1000
    }

    // "in X hours"
    const inHoursMatch = lowerInput.match(/in\s+(\d+)\s*(?:hours?|hrs?)/)
    if (inHoursMatch) {
        const hours = parseInt(inHoursMatch[1], 10)
        return now + hours * 60 * 60 * 1000
    }

    // "at HH:MM" or "at Ham" / "at Hpm"
    const atTimeMatch = lowerInput.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
    if (atTimeMatch) {
        let hours = parseInt(atTimeMatch[1], 10)
        const minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2], 10) : 0
        const period = atTimeMatch[3]

        if (period === "pm" && hours < 12) hours += 12
        if (period === "am" && hours === 12) hours = 0

        const target = new Date()
        target.setHours(hours, minutes, 0, 0)

        // If time is in the past, assume next day
        if (target.getTime() <= now) {
            target.setDate(target.getDate() + 1)
        }

        return target.getTime()
    }

    return null
}
