import { useState } from "react"
import { Demo } from "../article"
import { Slider } from "./controls"

const RUNS = 100

export function CompoundOdds() {
  const [reliability, setReliability] = useState(99)
  const [calls, setCalls] = useState(40)

  const success = Math.pow(reliability / 100, calls)
  const failed = Math.round((1 - success) * RUNS)

  return (
    <Demo
      label="Fig. 01"
      title="The compounding problem"
      hint="Drag the sliders"
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
        <div className="grid gap-6">
          <Slider
            label="Each call succeeds"
            value={reliability}
            min={90}
            max={99.9}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={setReliability}
          />
          <Slider
            label="Calls per agent run"
            value={calls}
            min={1}
            max={120}
            step={1}
            format={(v) => `${v} calls`}
            onChange={setCalls}
          />
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase">
              Runs that finish cleanly
            </p>
            <p className="mt-1 font-display text-6xl leading-none text-bone tabular-nums">
              {(success * 100).toFixed(1)}
              <span className="text-3xl text-bone/40">%</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-bone/50">
              {failed === 0
                ? "Every run survives. Enjoy it while it lasts."
                : `${failed} of every ${RUNS} runs hit at least one failure.`}
            </p>
          </div>
        </div>
        <div
          role="img"
          aria-label={`${RUNS - failed} of ${RUNS} runs succeed`}
          className="grid grid-cols-10 gap-1.5"
        >
          {Array.from({ length: RUNS }, (_, i) => (
            <span
              key={i}
              className={`aspect-square rounded-[3px] transition-colors duration-300 ${
                i >= RUNS - failed
                  ? "bg-[#ff5d4d]/80 shadow-[0_0_10px_rgba(255,93,77,0.35)]"
                  : "bg-bone/12"
              }`}
              style={{ transitionDelay: `${(i % 10) * 12}ms` }}
            />
          ))}
        </div>
      </div>
    </Demo>
  )
}
