import { Spinner } from "@renderer/components/ui/spinner"
import { Recorder } from "@renderer/lib/recorder"
import { playSound } from "@renderer/lib/sound"
import { cn } from "@renderer/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { rendererHandlers, tipcClient } from "~/lib/tipc-client"

const VISUALIZER_BUFFER_LENGTH = 70

const getInitialVisualizerData = () =>
  Array<number>(VISUALIZER_BUFFER_LENGTH).fill(-1000)

export function Component() {
  const [visualizerData, setVisualizerData] = useState(() =>
    getInitialVisualizerData(),
  )
  const [recording, setRecording] = useState(false)
  const isConfirmedRef = useRef(false)

  const transcribeMutation = useMutation({
    mutationFn: async ({
      blob,
      duration,
    }: {
      blob: Blob
      duration: number
    }) => {
      await tipcClient.createRecording({
        recording: await blob.arrayBuffer(),
        duration,
      })
    },
    onError(error) {
      tipcClient.hidePanelWindow()
      tipcClient.displayError({
        title: error.name,
        message: error.message,
      })
    },
  })

  const recorderRef = useRef<Recorder | null>(null)

  useEffect(() => {
    if (recorderRef.current) return

    const recorder = (recorderRef.current = new Recorder())

    recorder.on("record-start", () => {
      setRecording(true)
      tipcClient.recordEvent({ type: "start" })
    })

    recorder.on("visualizer-data", (rms) => {
      setVisualizerData((prev) => {
        const data = [...prev, rms]

        if (data.length > VISUALIZER_BUFFER_LENGTH) {
          data.shift()
        }

        return data
      })
    })

    recorder.on("record-end", (blob, duration) => {
      setRecording(false)
      setVisualizerData(() => getInitialVisualizerData())
      tipcClient.recordEvent({ type: "end" })

      if (!isConfirmedRef.current) return

      playSound("end_record")
      transcribeMutation.mutate({
        blob,
        duration,
      })
    })
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.startRecording.listen(() => {
      setVisualizerData(() => getInitialVisualizerData())
      recorderRef.current?.startRecording()
    })

    return unlisten
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.finishRecording.listen(() => {
      isConfirmedRef.current = true
      recorderRef.current?.stopRecording()
    })

    return unlisten
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.stopRecording.listen(() => {
      isConfirmedRef.current = false
      recorderRef.current?.stopRecording()
    })

    return unlisten
  }, [])

  useEffect(() => {
    const unlisten = rendererHandlers.startOrFinishRecording.listen(() => {
      if (recording) {
        isConfirmedRef.current = true
        recorderRef.current?.stopRecording()
      } else {
        tipcClient.showPanelWindow()
        recorderRef.current?.startRecording()
      }
    })

    return unlisten
  }, [recording])

  return (
    <div className="flex h-screen dark:text-white">
      {transcribeMutation.isPending ? (
        <div className="flex h-full w-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="relative flex items-center overflow-hidden"
            dir="rtl"
          >
            <div className="flex h-10 items-end gap-0.5">
              {visualizerData
                .slice()
                .reverse()
                .map((rms, index) => {
                  const isActive = rms !== -1000
                  const height = Math.min(100, Math.max(10, rms * 100))
                  return (
                    <div
                      key={index}
                      className="w-1 shrink-0 rounded-full transition-all duration-75"
                      style={{
                        height: `${height}%`,
                        backgroundColor: isActive ? "#40E0D0" : "#3a3a4a",
                        boxShadow: isActive
                          ? "0 0 8px #40E0D0, 0 0 16px #40E0D0, 0 0 24px #20B2AA"
                          : "none",
                      }}
                    />
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
