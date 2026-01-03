// Audio processing presets for different environments

export const AUDIO_PRESETS = {
    "calm": {
        label: "Calm",
        description: "Quiet room, normal speaking voice",
        highPassHz: 80,
        lowPassHz: 8000,
        compressorThreshold: -30,
        compressorRatio: 4,
        gain: 2
    },
    "quiet": {
        label: "Quiet",
        description: "Some ambient noise (fan, AC)",
        highPassHz: 120,
        lowPassHz: 6000,
        compressorThreshold: -35,
        compressorRatio: 6,
        gain: 3
    },
    "restaurant": {
        label: "Restaurant",
        description: "People talking nearby, moderate noise",
        highPassHz: 150,
        lowPassHz: 5000,
        compressorThreshold: -40,
        compressorRatio: 8,
        gain: 5
    },
    "background-music": {
        label: "Background Music",
        description: "Instrumental music playing nearby",
        highPassHz: 200,
        lowPassHz: 4000,
        compressorThreshold: -45,
        compressorRatio: 10,
        gain: 6
    },
    "max-isolation": {
        label: "Max Isolation",
        description: "Loud music, very soft speech",
        highPassHz: 250,
        lowPassHz: 3500,
        compressorThreshold: -50,
        compressorRatio: 12,
        gain: 8
    }
} as const

export type AudioPresetId = keyof typeof AUDIO_PRESETS

export const DEFAULT_AUDIO_SETTINGS = AUDIO_PRESETS["background-music"]
