import { useMemo, useState } from "react"
import { costUsd, fitToBudget } from "@/lib/traces/budget"
import { mulberry32 } from "@/lib/traces/sampling"
import { Demo } from "../article"
import { Slider, Toggle } from "../demos/controls"

const SYSTEM = 850
const N = 400
const MAX = 32_000
const BINS = 40

type Sample = {
  system: number
  history: number
  question: number
  retrieved: number
  output: number
  dropped: number
}

const simulate = (
  topK: number,
  turns: number,
  budget: number,
  trim: boolean
) => {
  const rand = mulberry32(11)
  return Array.from({ length: N }, (): Sample => {
    let history = 0
    const depth = Math.floor(rand() * (turns + 1))
    for (let t = 0; t < depth; t++) history += 180 + rand() * 340
    const question = 20 + rand() * 100
    const chunks = Array.from({ length: topK }, (_, i) => ({
      id: String(i),
      tokens: 380 + rand() * 90,
      score: 0.95 - i * 0.02 - rand() * 0.05,
    }))
    const all = chunks.reduce((n, c) => n + c.tokens, 0)
    const reserved = SYSTEM + history + question
    const fit = trim ? fitToBudget(chunks, { budget, reserved }) : null
    return {
      system: SYSTEM,
      history,
      question,
      retrieved: fit ? fit.tokens - reserved : all,
      output: 120 + rand() * 260,
      dropped: fit?.dropped ?? 0,
    }
  })
}

const inputOf = (s: Sample) => s.system + s.history + s.question + s.retrieved

const pct = (sorted: ReadonlyArray<number>, p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]

const k = (v: number) => `${(v / 1000).toFixed(1)}k`

const parts = [
  { key: "system", label: "System", color: "bg-bone/40" },
  { key: "history", label: "History", color: "bg-glacier" },
  { key: "question", label: "Question", color: "bg-bone/70" },
  { key: "retrieved", label: "Retrieved", color: "bg-ember" },
  { key: "output", label: "Output", color: "bg-ember-soft/50" },
] as const

export function BudgetLab() {
  const [topK, setTopK] = useState(8)
  const [turns, setTurns] = useState(12)
  const [budget, setBudget] = useState(8000)
  const [trim, setTrim] = useState(false)

  const samples = useMemo(
    () => simulate(topK, turns, budget, trim),
    [topK, turns, budget, trim]
  )
  const inputs = samples.map(inputOf).sort((a, b) => a - b)
  const over = inputs.filter((v) => v > budget).length / N
  const cost =
    (samples.reduce((n, s) => n + costUsd(inputOf(s), s.output), 0) / N) * 1000
  const dropped = samples.reduce((n, s) => n + s.dropped, 0) / N

  const bins = Array.from({ length: BINS }, () => 0)
  for (const v of inputs)
    bins[Math.min(BINS - 1, Math.floor((v / MAX) * BINS))]++
  const peak = Math.max(...bins)

  const avg = Object.fromEntries(
    parts.map((p) => [p.key, samples.reduce((n, s) => n + s[p.key], 0) / N])
  ) as Record<(typeof parts)[number]["key"], number>
  const avgTotal = parts.reduce((n, p) => n + avg[p.key], 0)

  return (
    <Demo
      label="Fig. 02"
      title="Where the tokens go"
      hint="400 simulated requests"
    >
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Slider
          label="Retrieved chunks (top-k)"
          value={topK}
          min={1}
          max={32}
          step={1}
          format={(v) => String(v)}
          onChange={setTopK}
        />
        <Slider
          label="Max history turns kept"
          value={turns}
          min={0}
          max={30}
          step={1}
          format={(v) => String(v)}
          onChange={setTurns}
        />
        <Slider
          label="Input token budget"
          value={budget}
          min={2000}
          max={32000}
          step={1000}
          format={k}
          onChange={setBudget}
        />
        <div className="flex items-end">
          <Toggle
            label="Trim retrieval to fit the budget"
            checked={trim}
            onChange={setTrim}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="relative flex h-32 items-end gap-px">
          {bins.map((b, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-[2px] transition-[height] duration-300 ${
                (i + 1) * (MAX / BINS) > budget
                  ? "bg-[#ff5d4d]/70"
                  : "bg-ember/70"
              }`}
              style={{ height: `${peak ? (b / peak) * 100 : 0}%` }}
            />
          ))}
          <div
            className="absolute inset-y-0 w-px bg-bone/70 transition-[left] duration-300"
            style={{ left: `${(budget / MAX) * 100}%` }}
          >
            <span className="absolute -top-1 left-1.5 font-mono text-[10px] whitespace-nowrap text-bone/70">
              budget {k(budget)}
            </span>
          </div>
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-bone/30">
          <span>0</span>
          <span>input tokens per request</span>
          <span>32k</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex h-3 overflow-hidden rounded-full">
          {parts.map((p) => (
            <div
              key={p.key}
              className={`${p.color} transition-[width] duration-300`}
              style={{ width: `${(avg[p.key] / avgTotal) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-bone/45">
          {parts.map((p) => (
            <span key={p.key} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${p.color}`} />
              {p.label} {k(avg[p.key])}
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-bone/10 bg-bone/10 sm:grid-cols-4">
        {[
          ["p50 input", k(pct(inputs, 0.5)), false],
          ["p95 input", k(pct(inputs, 0.95)), pct(inputs, 0.95) > budget],
          ["Over budget", `${(over * 100).toFixed(1)}%`, over > 0.01],
          ["Per 1k requests", `$${cost.toFixed(2)}`, false],
        ].map(([label, v, bad]) => (
          <div key={String(label)} className="bg-[#0a0b0d] px-3 py-2">
            <dt className="font-mono text-[9px] tracking-[0.2em] text-bone/35 uppercase">
              {label}
            </dt>
            <dd
              className={`mt-0.5 font-mono text-sm tabular-nums ${bad ? "text-[#ff8f84]" : "text-bone/85"}`}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-mono text-[11px] text-bone/40">
        {trim
          ? over > 0
            ? `Trimming drops ${dropped.toFixed(1)} chunks per request, yet ${(over * 100).toFixed(0)}% still exceed: history alone is over budget.`
            : `Trimming drops ${dropped.toFixed(1)} chunks per request on average. Nothing exceeds the budget.`
          : "Every bar right of the line is a request you paid for and probably didn't need."}
      </p>
    </Demo>
  )
}
