# Kobo - AI Powered Dictation

**Kobo** is an AI-powered dictation application forked from [Whispo](https://github.com/egoist/whispo) with significant enhancements.

## Modifications from Original Whispo

This fork includes the following enhancements:

- **Custom AI Models**: Users can specify their own STT (Speech-to-Text) and LLM (Chat) model names
- **New Keyboard Shortcut**: Added `Ctrl+Alt+Shift+,` as a recording shortcut option
- **Enhanced Voice Amplification**: 3x audio gain for better transcription of soft speech
- **Always-On-Top Panel**: Recording visualizer stays above all windows
- **Voice-Activated Reminders**: Set reminders using natural language
- **Crash Recovery**: Last 3 recordings are preserved for recovery
- **Single Instance Lock**: Prevents multiple app instances
- **Dark Turquoise Theme**: Modern black background with neon turquoise accents
- **Custom Waveform Icon**: New purple/pink gradient waveform icon

## Installation

Download the latest release from the [Releases](https://github.com/Kokulawarman/kobo/releases) page.

## Building from Source

```bash
npm install
npm run build:win  # For Windows
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

### Original Project

Based on [Whispo](https://github.com/egoist/whispo) by [egoist](https://github.com/egoist).

## Credits

- Original Whispo by [egoist](https://github.com/egoist)
- Kobo modifications and enhancements by [Kokulawarman](https://github.com/Kokulawarman)
