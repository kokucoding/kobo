import EventEmitter from "./event-emitter"
import { tipcClient } from "./tipc-client"
import { DEFAULT_AUDIO_SETTINGS } from "@shared/audio-presets"

const MIN_DECIBELS = -45
const MAX_RECORDING_TIME = 30 * 60 * 1000 // 30 minutes max

const logTime = (label: string) => {
  let time = performance.now()
  console.log(`${label} started at`, time)

  return (step: string) => {
    const now = performance.now()
    console.log(`${label} / ${step} took`, now - time)
    time = now
  }
}

const calculateRMS = (data: Uint8Array) => {
  let sumSquares = 0
  for (let i = 0; i < data.length; i++) {
    const normalizedValue = (data[i] - 128) / 128 // Normalize the data
    sumSquares += normalizedValue * normalizedValue
  }
  return Math.sqrt(sumSquares / data.length)
}

const normalizeRMS = (rms: number) => {
  rms = rms * 10
  const exp = 1.5 // Adjust exponent value; values greater than 1 expand larger numbers more and compress smaller numbers more
  const scaledRMS = Math.pow(rms, exp)

  // Scale between 0.01 (1%) and 1.0 (100%)
  return Math.min(1.0, Math.max(0.01, scaledRMS))
}

export class Recorder extends EventEmitter<{
  "record-start": []
  "record-end": [Blob, number]
  "visualizer-data": [number]
  destroy: []
}> {
  stream: MediaStream | null = null
  mediaRecorder: MediaRecorder | null = null
  recordingTimeout: number | null = null

  constructor() {
    super()
  }

  analyseAudio(stream: MediaStream) {
    let processFrameTimer: number | null = null

    const audioContext = new AudioContext()
    const audioStreamSource = audioContext.createMediaStreamSource(stream)

    const analyser = audioContext.createAnalyser()
    analyser.minDecibels = MIN_DECIBELS
    audioStreamSource.connect(analyser)

    const bufferLength = analyser.frequencyBinCount

    const domainData = new Uint8Array(bufferLength)
    const timeDomainData = new Uint8Array(analyser.fftSize)

    const animate = (fn: () => void) => {
      processFrameTimer = requestAnimationFrame(fn)
    }

    const detectSound = () => {
      const processFrame = () => {
        analyser.getByteTimeDomainData(timeDomainData)
        analyser.getByteFrequencyData(domainData)

        // Calculate RMS level from time domain data
        const rmsLevel = calculateRMS(timeDomainData)
        const rms = normalizeRMS(rmsLevel)

        this.emit("visualizer-data", rms)

        animate(processFrame)
      }

      animate(processFrame)
    }

    detectSound()

    return () => {
      processFrameTimer && cancelAnimationFrame(processFrameTimer)
      audioStreamSource.disconnect()
      audioContext.close()
    }
  }

  async startRecording() {
    this.stopRecording()

    const log = logTime("startRecording")

    // Request audio with noise suppression and echo cancellation
    const stream = (this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: "default",
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
      video: false,
    }))

    log("getUserMedia")

    // Get audio processing settings from config
    let highPassHz: number = DEFAULT_AUDIO_SETTINGS.highPassHz
    let lowPassHz: number = DEFAULT_AUDIO_SETTINGS.lowPassHz
    let compressorThreshold: number = DEFAULT_AUDIO_SETTINGS.compressorThreshold
    let compressorRatio: number = DEFAULT_AUDIO_SETTINGS.compressorRatio
    let gain: number = DEFAULT_AUDIO_SETTINGS.gain

    try {
      const config = await tipcClient.getConfig()
      highPassHz = config.audioHighPassHz ?? highPassHz
      lowPassHz = config.audioLowPassHz ?? lowPassHz
      compressorThreshold = config.audioCompressorThreshold ?? compressorThreshold
      compressorRatio = config.audioCompressorRatio ?? compressorRatio
      gain = config.audioGain ?? gain
    } catch (error) {
      console.warn("Failed to load audio config, using defaults:", error)
    }

    // Create audio processing chain with error handling
    let processedStream: MediaStream

    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)

      // HIGH-PASS FILTER: Remove bass/beats below cutoff
      const highPassFilter = audioContext.createBiquadFilter()
      highPassFilter.type = "highpass"
      highPassFilter.frequency.setValueAtTime(highPassHz, audioContext.currentTime)
      highPassFilter.Q.setValueAtTime(0.7, audioContext.currentTime)

      // LOW-PASS FILTER: Remove high frequencies above cutoff
      const lowPassFilter = audioContext.createBiquadFilter()
      lowPassFilter.type = "lowpass"
      lowPassFilter.frequency.setValueAtTime(lowPassHz, audioContext.currentTime)
      lowPassFilter.Q.setValueAtTime(0.7, audioContext.currentTime)

      // COMPRESSOR for normalizing volume (catches soft speech)
      const compressor = audioContext.createDynamicsCompressor()
      compressor.threshold.setValueAtTime(compressorThreshold, audioContext.currentTime)
      compressor.knee.setValueAtTime(10, audioContext.currentTime)
      compressor.ratio.setValueAtTime(compressorRatio, audioContext.currentTime)
      compressor.attack.setValueAtTime(0, audioContext.currentTime)
      compressor.release.setValueAtTime(0.1, audioContext.currentTime)

      // GAIN node for amplification
      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(gain, audioContext.currentTime)

      // LIMITER to prevent clipping
      const limiter = audioContext.createDynamicsCompressor()
      limiter.threshold.setValueAtTime(-3, audioContext.currentTime)
      limiter.knee.setValueAtTime(0, audioContext.currentTime)
      limiter.ratio.setValueAtTime(20, audioContext.currentTime)
      limiter.attack.setValueAtTime(0, audioContext.currentTime)
      limiter.release.setValueAtTime(0.1, audioContext.currentTime)

      // Connect the audio processing chain
      source.connect(highPassFilter)
      highPassFilter.connect(lowPassFilter)
      lowPassFilter.connect(compressor)
      compressor.connect(gainNode)
      gainNode.connect(limiter)

      // Create a destination to capture the processed audio
      const destination = audioContext.createMediaStreamDestination()
      limiter.connect(destination)

      processedStream = destination.stream
      log("audio processing chain created")
    } catch (error) {
      // Fallback: use original stream without processing
      console.error("Audio processing failed, using raw stream:", error)
      processedStream = stream
    }

    const mediaRecorder = (this.mediaRecorder = new MediaRecorder(processedStream, {
      audioBitsPerSecond: 128e3,
    }))
    log("new MediaRecorder")

    let audioChunks: Blob[] = []
    let startTime = Date.now()

    // Set max recording time protection
    this.recordingTimeout = window.setTimeout(() => {
      console.warn("Max recording time reached, auto-stopping")
      this.stopRecording()
    }, MAX_RECORDING_TIME)

    // Start timing for mediaRecorder.onstart
    mediaRecorder.onstart = () => {
      log("onstart")
      startTime = Date.now()
      this.emit("record-start")
      const stopAnalysing = this.analyseAudio(stream)
      this.once("destroy", stopAnalysing)
      // playSound("begin_record")
    }

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }

    mediaRecorder.onerror = (event) => {
      console.error("MediaRecorder error:", event)
      // Attempt to salvage what we have
      if (audioChunks.length > 0) {
        const blob = new Blob(audioChunks, { type: "audio/webm" })
        if (blob.size > 0) {
          this.emit("record-end", blob, Date.now() - startTime)
        }
      }
      audioChunks = []
    }

    mediaRecorder.onstop = async () => {
      // Clear timeout
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout)
        this.recordingTimeout = null
      }

      const duration = Date.now() - startTime
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType })

      // Validate blob before emitting
      if (blob.size === 0) {
        console.error("Empty recording, discarding")
        audioChunks = []
        return
      }

      this.emit("record-end", blob, duration)
      audioChunks = []
    }

    mediaRecorder.start()
  }

  stopRecording() {
    // Clear timeout if exists
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout)
      this.recordingTimeout = null
    }

    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.stop()
      } catch (error) {
        console.error("Error stopping MediaRecorder:", error)
      }
      this.mediaRecorder = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    this.emit("destroy")
  }
}
