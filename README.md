# Kobo - AI Powered Voice Dictation

<p align="center">
  <img src="resources/icon.png" alt="Kobo Logo" width="128" height="128">
</p>

**Kobo** is an advanced AI-powered voice dictation application. Press a hotkey, speak, and your words are transcribed and typed wherever your cursor is. Enhanced fork of [Whispo](https://github.com/egoist/whispo) with significant improvements for noisy environments and soft speech.

## ✨ Key Features

### 🎤 Voice-to-Text Dictation
- Press a hotkey to start recording
- Speak naturally - your words are transcribed using Whisper AI
- Text is automatically typed at your cursor position

### 🎵 Advanced Audio Processing (NEW)
Designed for **noisy environments** - works even with background music playing:

| Feature | Description |
|---------|-------------|
| **High-Pass Filter** | Removes bass and rumble (beats, 808s) |
| **Low-Pass Filter** | Removes high frequencies (cymbals, hiss) |
| **Dynamic Compressor** | Catches soft/whispered speech |
| **Amplification** | Boosts quiet voices up to 15x |
| **Limiter** | Prevents audio clipping |

**5 Environment Presets:**
- 🏠 **Calm** - Quiet room, normal speaking
- 🌙 **Quiet** - Light ambient noise (fan, AC)
- 🍽️ **Restaurant** - People talking nearby
- 🎵 **Background Music** - Instrumental music playing
- 🔊 **Max Isolation** - Loud music, very soft speech

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Hold Ctrl** | Hold to record, release to finish |
| **Ctrl + /** | Toggle recording on/off |
| **Ctrl + Alt + Shift + ,** | Alternative shortcut (doesn't conflict with other apps) |

> **Note:** `Ctrl + Alt + Shift + ,` is recommended if other shortcuts conflict with your existing applications.

### 🤖 Custom AI Models
Configure your own models for both transcription and post-processing:

- **STT Model**: Choose which Whisper model to use (e.g., `whisper-large-v3-turbo`)
- **Chat Model**: Choose which LLM to use for post-processing (e.g., `llama-3.3-70b-versatile`)

### 📝 Transcript Post-Processing
Use AI to clean up, reformat, or transform your transcriptions:
- Fix grammar and punctuation
- Convert to bullet points
- Translate to another language
- Custom prompts with `{transcript}` placeholder

### 🛡️ Reliability Features
- **Single Instance Lock** - Prevents multiple app instances
- **30-Minute Timeout** - Auto-stops very long recordings
- **Crash Recovery** - Last 3 recordings are preserved
- **Graceful Fallback** - If audio processing fails, uses raw audio

## 🎨 User Interface
- **Dark Turquoise Theme** - Easy on the eyes
- **Always-On-Top Recording Panel** - Never hidden behind windows
- **System Tray Integration** - Runs quietly in background

## 📥 Installation

### Windows
1. Download `kobo-1.0.0-setup.exe` from [Releases](https://github.com/Kokulawarman/kobo/releases)
2. Run the installer
3. Launch Kobo from Start Menu

### Building from Source
```bash
# Clone the repository
git clone https://github.com/Kokulawarman/kobo.git
cd kobo

# Install dependencies
npm install

# Build for Windows
npm run build:win
```

## ⚙️ Configuration

### API Keys Required
You need at least one API key for transcription:
- **Groq** (Recommended - Fast & Free tier available)
- **OpenAI** (Whisper API)
- **Google Gemini**

Go to **Settings → Providers** to add your API keys.

### Recommended Settings for Noisy Environments

If you're in a shared space with music playing:

1. Go to **Settings → General → Audio Processing**
2. Select **"Max Isolation"** preset
3. Or manually adjust:
   - High-Pass Filter: 250 Hz
   - Low-Pass Filter: 3500 Hz
   - Voice Sensitivity: -50 dB
   - Compression: 12:1
   - Amplification: 8x

## 📋 Changelog from Original Whispo

### New Features
- ✅ **Audio Processing Section** with 5 presets and 5 adjustable sliders
- ✅ **Ctrl+Alt+Shift+, shortcut** (for apps that use Ctrl+/)
- ✅ **Custom STT/LLM model selection**
- ✅ **Single instance lock**
- ✅ **30-minute recording timeout**
- ✅ **Crash recovery for recordings**

### Improvements
- 🎨 Dark turquoise theme
- 🔊 3-8x voice amplification (configurable)
- 📌 Panel stays above fullscreen windows
- 🌊 Custom waveform icon

### Technical
- High-pass/low-pass frequency filters
- Dynamic compression for soft speech
- Limiter to prevent clipping
- Graceful error handling with fallbacks

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

You are free to:
- ✅ Use this software
- ✅ Modify the source code
- ✅ Distribute copies
- ✅ Use commercially

Requirements:
- 📜 Keep the same license
- 📝 Document your changes
- 🔓 Make source code available

See [LICENSE](LICENSE) for full details.

## 🙏 Credits

- **Original Whispo** by [egoist](https://github.com/egoist)
- **Kobo enhancements** by [Kokulawarman](https://github.com/Kokulawarman)

---

<p align="center">
  Made with 💜 for people who need to dictate in noisy environments
</p>
