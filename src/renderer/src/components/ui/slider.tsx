import * as React from "react"
import { cn } from "~/lib/utils"

export interface SliderProps {
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
    className?: string
    showValue?: boolean
    unit?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ value, min, max, step = 1, onChange, className, showValue = true, unit = "" }, ref) => {
        return (
            <div className={cn("flex items-center gap-3", className)}>
                <input
                    ref={ref}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg border border-muted-foreground bg-muted
            [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-lg [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-primary/30 [&::-webkit-slider-runnable-track]:to-primary
            [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(64,224,208,0.6)]
            [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-lg [&::-moz-range-track]:bg-gradient-to-r [&::-moz-range-track]:from-primary/30 [&::-moz-range-track]:to-primary
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-primary"
                />
                {showValue && (
                    <span className="min-w-[4rem] text-right text-sm font-medium text-primary">
                        {value}{unit}
                    </span>
                )}
            </div>
        )
    }
)
Slider.displayName = "Slider"

export { Slider }
