import { useMemo, useState } from "react"
import {
  headSampled,
  syntheticTraces,
  tailSampled,
} from "@/lib/traces/sampling"
import type { TailPolicy, TraceSummary } from "@/lib/traces/sampling"
import { Demo } from "../article"
import { Segmented, Slider, Toggle } from "../demos/controls"

const traces = syntheticTraces(2000)
const COLS = 50

type Kind = "error" | "slow" | "budget" | "ungrounded" | null

const kindOf = (t: TraceSummary): Kind => {
  if (t.error) return "error"
  if (t.durationMs > 4000) return "slow"
  if (t.tokens > 8000) return "budget"
  if (t.groundedness < 0.5) return "ungrounded"
  return null
}

const kinds = [
  { kind: "error", label: "Errors", color: "#ff5d4d" },
  { kind: "slow", label: "Slow > 4s", color: "#ff9a3c" },
  { kind: "budget", label: "Over budget", color: "#7cc4e8" },
  { kind: "ungrounded", label: "Ungrounded", color: "#c49bff" },
] as const

export function SamplingLab() {
  const [mode, setMode] = useState<"head" | "tail">("head")
  const [ratio, setRatio] = useState(0.1)
  const [rules, setRules] = useState({
    error: true,
    slow: true,
    budget: true,
    ungrounded: true,
  })

  const kept = useMemo(() => {
    const policy: TailPolicy = {
      errors: rules.error,
      slowerThanMs: rules.slow ? 4000 : null,
      overBudget: rules.budget ? 8000 : null,
      groundednessBelow: rules.ungrounded ? 0.5 : null,
      baseline: ratio,
    }
    return traces.map((t) =>
      mode === "head" ? headSampled(t.traceId, ratio) : tailSampled(t, policy)
    )
  }, [mode, ratio, rules])

  const total = kept.filter(Boolean).length
  const stats = kinds.map((k) => {
    let all = 0
    let saved = 0
    traces.forEach((t, i) => {
      if (kindOf(t) !== k.kind) return
      all++
      if (kept[i]) saved++
    })
    return { ...k, all, saved }
  })

  return (
    <Demo
      label="Fig. 03"
      title="Keep the traces that matter"
      hint="2,000 traces · real OTel sampler"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented
          label="Strategy"
          value={mode}
          onChange={setMode}
          options={[
            { value: "head", label: "Head: TraceIdRatioBased" },
            { value: "tail", label: "Tail: keep interesting" },
          ]}
        />
        <div className="w-full sm:w-64">
          <Slider
            label={mode === "head" ? "Sample ratio" : "Baseline ratio"}
            value={ratio}
            min={0.01}
            max={0.5}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={setRatio}
          />
        </div>
      </div>

      {mode === "tail" && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {kinds.map((k) => (
            <Toggle
              key={k.kind}
              label={`Keep ${k.label.toLowerCase()}`}
              checked={rules[k.kind]}
              onChange={(v) => setRules((r) => ({ ...r, [k.kind]: v }))}
            />
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${COLS * 10} ${(traces.length / COLS) * 10}`}
        className="mt-5 h-auto w-full"
        role="img"
        aria-label={`${total} of ${traces.length} traces kept`}
      >
        {traces.map((t, i) => {
          const kind = kindOf(t)
          const color = kinds.find((k) => k.kind === kind)?.color
          const keep = kept[i]
          return (
            <rect
              key={t.traceId}
              x={(i % COLS) * 10 + 1.5}
              y={Math.floor(i / COLS) * 10 + 1.5}
              width={7}
              height={7}
              rx={1.5}
              fill={color ?? "#f2ede4"}
              opacity={keep ? (color ? 1 : 0.4) : color ? 0.18 : 0.05}
            />
          )
        })}
      </svg>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-bone/10 bg-bone/10 sm:grid-cols-5">
        <div className="bg-[#0a0b0d] px-3 py-2">
          <dt className="font-mono text-[9px] tracking-[0.2em] text-bone/35 uppercase">
            Stored
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-bone/85 tabular-nums">
            {((total / traces.length) * 100).toFixed(1)}%
          </dd>
        </div>
        {stats.map((s) => (
          <div key={s.kind} className="bg-[#0a0b0d] px-3 py-2">
            <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-bone/35 uppercase">
              <span
                className="size-1.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </dt>
            <dd
              className={`mt-0.5 font-mono text-sm tabular-nums ${s.saved < s.all ? "text-[#ff8f84]" : "text-bone/85"}`}
            >
              {s.saved}/{s.all}
            </dd>
          </div>
        ))}
      </dl>
    </Demo>
  )
}
