import { useId } from "react"
import type { ReactNode } from "react"

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={id}
          className="font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase"
        >
          {label}
        </label>
        <span className="font-mono text-sm text-bone tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--color-ember) ${pct}%, rgba(237,230,218,0.12) ${pct}%)`,
        }}
        className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-bone [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bone [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,154,60,0.25)]"
      />
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-bone/60 uppercase transition-colors hover:text-bone"
    >
      <span
        className={`relative h-5 w-9 rounded-full border transition-colors ${
          checked ? "border-ember/60 bg-ember/25" : "border-bone/20 bg-bone/5"
        }`}
      >
        <span
          className={`absolute top-1/2 size-3 -translate-y-1/2 rounded-full transition-all ${
            checked ? "left-[1.2rem] bg-ember" : "left-1 bg-bone/50"
          }`}
        />
      </span>
      {label}
    </button>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  onChange: (v: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wider transition-colors ${
            value === o.value
              ? "border-ember/60 bg-ember/15 text-bone"
              : "border-bone/15 text-bone/50 hover:border-bone/30 hover:text-bone/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: "primary" | "ghost" | "danger"
}) {
  const tones = {
    primary: "bg-bone text-ink hover:bg-ember",
    ghost:
      "border border-bone/20 text-bone/75 hover:border-bone/40 hover:text-bone",
    danger:
      "border border-[#ff5d4d]/50 bg-[#ff5d4d]/10 text-[#ff8f84] hover:bg-[#ff5d4d]/20",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-35 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}
