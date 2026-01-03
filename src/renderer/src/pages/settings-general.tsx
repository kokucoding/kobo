import { Control, ControlGroup } from "@renderer/components/ui/control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select"
import { Switch } from "@renderer/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip"
import {
  CHAT_PROVIDER_ID,
  CHAT_PROVIDERS,
  STT_PROVIDER_ID,
  STT_PROVIDERS,
} from "@shared/index"
import { Textarea } from "@renderer/components/ui/textarea"
import { Input } from "@renderer/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@renderer/components/ui/dialog"
import { Button } from "@renderer/components/ui/button"
import {
  useConfigQuery,
  useSaveConfigMutation,
} from "@renderer/lib/query-client"
import { Config } from "@shared/types"
import { Slider } from "@renderer/components/ui/slider"
import { AUDIO_PRESETS, AudioPresetId } from "@shared/audio-presets"

export function Component() {
  const configQuery = useConfigQuery()

  const saveConfigMutation = useSaveConfigMutation()

  const saveConfig = (config: Partial<Config>) => {
    saveConfigMutation.mutate({
      config: {
        ...configQuery.data,
        ...config,
      },
    })
  }

  const sttProviderId: STT_PROVIDER_ID =
    configQuery.data?.sttProviderId || "openai"
  const shortcut = configQuery.data?.shortcut || "hold-ctrl"
  const transcriptPostProcessingProviderId: CHAT_PROVIDER_ID =
    configQuery.data?.transcriptPostProcessingProviderId || "openai"

  // Audio processing settings
  const audioPreset = configQuery.data?.audioPreset || "background-music"
  const audioHighPassHz = configQuery.data?.audioHighPassHz ?? 200
  const audioLowPassHz = configQuery.data?.audioLowPassHz ?? 4000
  const audioCompressorThreshold = configQuery.data?.audioCompressorThreshold ?? -45
  const audioCompressorRatio = configQuery.data?.audioCompressorRatio ?? 10
  const audioGain = configQuery.data?.audioGain ?? 6

  const applyPreset = (presetId: AudioPresetId) => {
    const preset = AUDIO_PRESETS[presetId]
    saveConfig({
      audioPreset: presetId,
      audioHighPassHz: preset.highPassHz,
      audioLowPassHz: preset.lowPassHz,
      audioCompressorThreshold: preset.compressorThreshold,
      audioCompressorRatio: preset.compressorRatio,
      audioGain: preset.gain,
    })
  }

  if (!configQuery.data) return null

  return (
    <div className="grid gap-4">
      {process.env.IS_MAC && (
        <ControlGroup title="App">
          <Control label="Hide Dock Icon" className="px-3">
            <Switch
              defaultChecked={configQuery.data.hideDockIcon}
              onCheckedChange={(value) => {
                saveConfig({
                  hideDockIcon: value,
                })
              }}
            />
          </Control>
        </ControlGroup>
      )}

      <ControlGroup
        title="Shortcuts"
        endDescription={
          <div className="flex items-center gap-1">
            <div>
              {shortcut === "hold-ctrl"
                ? "Hold Ctrl key to record, release it to finish recording"
                : "Press Ctrl+/ to start and finish recording"}
            </div>
            <TooltipProvider disableHoverableContent delayDuration={0}>
              <Tooltip>
                <TooltipTrigger className="inline-flex items-center justify-center">
                  <span className="i-mingcute-information-fill text-base"></span>
                </TooltipTrigger>
                <TooltipContent collisionPadding={5}>
                  {shortcut === "hold-ctrl"
                    ? "Press any key to cancel"
                    : "Press Esc to cancel"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      >
        <Control label="Recording" className="px-3">
          <Select
            defaultValue={shortcut}
            onValueChange={(value) => {
              saveConfig({
                shortcut: value as typeof configQuery.data.shortcut,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hold-ctrl">Hold Ctrl</SelectItem>
              <SelectItem value="ctrl-slash">Ctrl+{"/"}</SelectItem>
              <SelectItem value="ctrl-alt-shift-comma">Ctrl+Alt+Shift+,</SelectItem>
            </SelectContent>
          </Select>
        </Control>
      </ControlGroup>

      <ControlGroup title="Speech to Text">
        <Control label="Provider" className="px-3">
          <Select
            defaultValue={sttProviderId}
            onValueChange={(value) => {
              saveConfig({
                sttProviderId: value as STT_PROVIDER_ID,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STT_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>
        <Control label="Model (optional)" className="px-3">
          <Input
            placeholder={sttProviderId === "groq" ? "whisper-large-v3" : "whisper-1"}
            defaultValue={configQuery.data.sttModel || ""}
            onChange={(e) => {
              saveConfig({
                sttModel: e.currentTarget.value || undefined,
              })
            }}
          />
        </Control>
      </ControlGroup>

      <ControlGroup title="Transcript Post-Processing">
        <Control label="Enabled" className="px-3">
          <Switch
            defaultChecked={configQuery.data.transcriptPostProcessingEnabled}
            onCheckedChange={(value) => {
              saveConfig({
                transcriptPostProcessingEnabled: value,
              })
            }}
          />
        </Control>

        {configQuery.data.transcriptPostProcessingEnabled && (
          <>
            <Control label="Provider" className="px-3">
              <Select
                defaultValue={transcriptPostProcessingProviderId}
                onValueChange={(value) => {
                  saveConfig({
                    transcriptPostProcessingProviderId:
                      value as CHAT_PROVIDER_ID,
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAT_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Control>

            <Control label="Model (optional)" className="px-3">
              <Input
                placeholder={transcriptPostProcessingProviderId === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini"}
                defaultValue={configQuery.data.chatModel || ""}
                onChange={(e) => {
                  saveConfig({
                    chatModel: e.currentTarget.value || undefined,
                  })
                }}
              />
            </Control>

            <Control label="Prompt" className="px-3">
              <div className="flex flex-col items-end gap-1 text-right">
                {configQuery.data.transcriptPostProcessingPrompt && (
                  <div className="line-clamp-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {configQuery.data.transcriptPostProcessingPrompt}
                  </div>
                )}
                <Dialog>
                  <DialogTrigger className="" asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 gap-1 px-2"
                    >
                      <span className="i-mingcute-edit-2-line"></span>
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Prompt</DialogTitle>
                    </DialogHeader>
                    <Textarea
                      rows={10}
                      defaultValue={
                        configQuery.data.transcriptPostProcessingPrompt
                      }
                      onChange={(e) => {
                        saveConfig({
                          transcriptPostProcessingPrompt: e.currentTarget.value,
                        })
                      }}
                    ></Textarea>
                    <div className="text-sm text-muted-foreground">
                      Use <span className="select-text">{"{transcript}"}</span>{" "}
                      placeholder to insert the original transcript
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Control>
          </>
        )}
      </ControlGroup>

      <ControlGroup
        title="Audio Processing"
        endDescription={
          <TooltipProvider disableHoverableContent delayDuration={0}>
            <Tooltip>
              <TooltipTrigger className="inline-flex items-center justify-center">
                <span className="i-mingcute-information-fill text-base"></span>
              </TooltipTrigger>
              <TooltipContent collisionPadding={5} className="max-w-xs">
                Adjust these settings to improve voice detection in noisy environments. Use presets for quick setup or adjust manually.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      >
        <Control label="Environment Preset" className="px-3">
          <Select
            value={audioPreset}
            onValueChange={(value) => {
              if (value === "custom") {
                saveConfig({ audioPreset: "custom" })
              } else {
                applyPreset(value as AudioPresetId)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AUDIO_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label} - {preset.description}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Control>

        <Control
          label={
            <div className="flex items-center gap-1">
              <span>High-Pass Filter</span>
              <TooltipProvider disableHoverableContent delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="i-mingcute-question-line text-xs text-muted-foreground"></span>
                  </TooltipTrigger>
                  <TooltipContent collisionPadding={5} className="max-w-xs">
                    Removes low frequencies (bass, rumble). Higher values remove more bass - good for filtering out music beats.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
          className="px-3"
        >
          <Slider
            value={audioHighPassHz}
            min={50}
            max={400}
            step={10}
            unit=" Hz"
            onChange={(value) => {
              saveConfig({ audioHighPassHz: value, audioPreset: "custom" })
            }}
          />
        </Control>

        <Control
          label={
            <div className="flex items-center gap-1">
              <span>Low-Pass Filter</span>
              <TooltipProvider disableHoverableContent delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="i-mingcute-question-line text-xs text-muted-foreground"></span>
                  </TooltipTrigger>
                  <TooltipContent collisionPadding={5} className="max-w-xs">
                    Removes high frequencies (hiss, cymbals). Lower values cut more highs - good for filtering hi-hats and cymbals.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
          className="px-3"
        >
          <Slider
            value={audioLowPassHz}
            min={2000}
            max={10000}
            step={100}
            unit=" Hz"
            onChange={(value) => {
              saveConfig({ audioLowPassHz: value, audioPreset: "custom" })
            }}
          />
        </Control>

        <Control
          label={
            <div className="flex items-center gap-1">
              <span>Voice Sensitivity</span>
              <TooltipProvider disableHoverableContent delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="i-mingcute-question-line text-xs text-muted-foreground"></span>
                  </TooltipTrigger>
                  <TooltipContent collisionPadding={5} className="max-w-xs">
                    How quiet of a voice to detect. Lower values (e.g., -50dB) catch softer whispers.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
          className="px-3"
        >
          <Slider
            value={audioCompressorThreshold}
            min={-60}
            max={-20}
            step={1}
            unit=" dB"
            onChange={(value) => {
              saveConfig({ audioCompressorThreshold: value, audioPreset: "custom" })
            }}
          />
        </Control>

        <Control
          label={
            <div className="flex items-center gap-1">
              <span>Compression</span>
              <TooltipProvider disableHoverableContent delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="i-mingcute-question-line text-xs text-muted-foreground"></span>
                  </TooltipTrigger>
                  <TooltipContent collisionPadding={5} className="max-w-xs">
                    Evens out volume differences. Higher ratios make soft and loud speech more similar in volume.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
          className="px-3"
        >
          <Slider
            value={audioCompressorRatio}
            min={2}
            max={20}
            step={1}
            unit=":1"
            onChange={(value) => {
              saveConfig({ audioCompressorRatio: value, audioPreset: "custom" })
            }}
          />
        </Control>

        <Control
          label={
            <div className="flex items-center gap-1">
              <span>Amplification</span>
              <TooltipProvider disableHoverableContent delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="i-mingcute-question-line text-xs text-muted-foreground"></span>
                  </TooltipTrigger>
                  <TooltipContent collisionPadding={5} className="max-w-xs">
                    Boosts your voice volume. Use higher values (6-8x) for soft speech, lower (2-3x) for normal volume.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
          className="px-3"
        >
          <Slider
            value={audioGain}
            min={1}
            max={15}
            step={0.5}
            unit="x"
            onChange={(value) => {
              saveConfig({ audioGain: value, audioPreset: "custom" })
            }}
          />
        </Control>
      </ControlGroup>
    </div>
  )
}

